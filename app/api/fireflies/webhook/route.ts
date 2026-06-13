import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import Groq from "groq-sdk";
import { createServiceRoleClient } from "@/lib/supabase";
import { sendTelegramMessage } from "@/lib/telegram";

interface FirefliesSummary {
  gist?: string;
  bullet_gist?: string;
  keywords?: string;
  short_summary?: string;
  overview?: string;
  action_items?: string;
  outline?: string;
}

interface FirefliesTranscriptData {
  title?: string;
  date?: string;
  dateString?: string;
  duration?: number;
  fireflies_url?: string;
  participants?: string[];
  summary?: FirefliesSummary;
}

interface FirefliesPayload {
  meetingId?: string;
  eventType?: string;
  title?: string;
  date?: string;
  duration?: number;
  fireflies_url?: string;
  transcript_url?: string;
  participants?: string[];
  summary?: FirefliesSummary;
  // Some Fireflies plans nest data under transcript
  transcript?: FirefliesTranscriptData & { id?: string };
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(rawBody, "utf8");
    const computed = hmac.digest("hex");
    const provided = signature.replace(/^sha256=/, "");
    if (computed.length !== provided.length) return false;
    return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

async function fetchFirefliesTranscript(
  transcriptId: string,
  apiKey: string
): Promise<FirefliesTranscriptData | null> {
  try {
    const res = await fetch("https://api.fireflies.ai/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: `query Transcript($id: String!) {
          transcript(id: $id) {
            id
            title
            dateString
            duration
            fireflies_url
            participants
            summary {
              gist
              bullet_gist
              keywords
              short_summary
              overview
              action_items
              outline
            }
          }
        }`,
        variables: { id: transcriptId },
      }),
    });

    if (!res.ok) {
      console.warn(`[fireflies/webhook] Fireflies API returned ${res.status}`);
      return null;
    }

    const json = await res.json() as { data?: { transcript?: FirefliesTranscriptData & { dateString?: string } } };
    const t = json?.data?.transcript;
    if (!t) return null;

    // Normalise dateString → date so downstream code stays consistent
    return {
      title: t.title,
      date: t.dateString ?? t.date,
      duration: t.duration,
      fireflies_url: t.fireflies_url,
      participants: t.participants,
      summary: t.summary,
    };
  } catch (err) {
    console.warn("[fireflies/webhook] Fireflies API fetch error:", err);
    return null;
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Fireflies webhook endpoint is reachable" });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Empty body = Fireflies config-validation ping
    if (!rawBody.trim()) {
      return NextResponse.json({ ok: true, message: "Ping acknowledged" });
    }

    // Verify webhook signing secret if configured
    const webhookSecret = process.env.FIREFLIES_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature =
        request.headers.get("x-fireflies-signature") ??
        request.headers.get("x-hub-signature-256") ??
        request.headers.get("x-signature") ??
        "";

      if (signature && !verifySignature(rawBody, signature, webhookSecret)) {
        console.warn("[fireflies/webhook] Invalid signature — rejected");
        return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody) as FirefliesPayload;

    console.log(
      `[fireflies/webhook] eventType=${payload.eventType ?? "unknown"} meetingId=${payload.meetingId ?? "unknown"}`
    );

    // Only process transcription/summary events — Fireflies uses different strings depending on plan/version
    const ACCEPTED_EVENTS = new Set([
      "Transcription completed", // legacy / some plan variants
      "Meeting summarized",      // Pro plan — summary is ready, preferred trigger
    ]);
    if (payload.eventType && !ACCEPTED_EVENTS.has(payload.eventType)) {
      console.log(`[fireflies/webhook] Skipping event type: ${payload.eventType}`);
      return NextResponse.json({ ok: true, message: `Skipped event: ${payload.eventType}` });
    }

    // Normalise: some plans nest data under payload.transcript
    let data: FirefliesTranscriptData = payload.transcript ?? payload;

    // If summary is missing from the webhook payload, fetch it from the Fireflies API.
    // This is expected on non-Business plans where the webhook is a notification-only ping.
    if (!data.summary) {
      const apiKey = process.env.FIREFLIES_API_KEY;
      const transcriptId = payload.meetingId ?? payload.transcript?.id;

      if (apiKey && transcriptId) {
        console.log(`[fireflies/webhook] No summary in payload — fetching from Fireflies API (id: ${transcriptId})`);
        const fetched = await fetchFirefliesTranscript(transcriptId, apiKey);
        if (fetched) {
          data = {
            title: fetched.title ?? data.title,
            date: fetched.date ?? data.date,
            duration: fetched.duration ?? data.duration,
            fireflies_url: fetched.fireflies_url ?? data.fireflies_url,
            participants: fetched.participants ?? data.participants,
            summary: fetched.summary,
          };
        }
      } else {
        if (!apiKey) console.warn("[fireflies/webhook] FIREFLIES_API_KEY not set — cannot fetch transcript");
        if (!transcriptId) console.warn("[fireflies/webhook] No meetingId in payload — cannot fetch transcript");
      }
    }

    const title = data.title ?? payload.title ?? "Team Meeting";
    const summary = data.summary ?? payload.summary;
    const duration = data.duration ?? payload.duration;
    const firefliesUrl = data.fireflies_url ?? payload.transcript_url ?? "";
    const participants = data.participants ?? payload.participants ?? [];
    const dateRaw = data.date ?? payload.date ?? new Date().toISOString();

    if (!summary) {
      console.log(
        "[fireflies/webhook] No summary after API fallback — skipping",
        JSON.stringify(payload).slice(0, 300)
      );
      return NextResponse.json({ ok: true, message: "No summary content, nothing to post" });
    }

    const dateStr = new Date(dateRaw).toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Manila",
    });

    // Build raw context from whatever fields Fireflies provided
    const parts: string[] = [];
    if (summary.gist) parts.push(`Gist: ${summary.gist}`);
    if (summary.short_summary) parts.push(`Summary: ${summary.short_summary}`);
    if (summary.overview) parts.push(`Overview: ${summary.overview}`);
    if (summary.bullet_gist) parts.push(`Key Points:\n${summary.bullet_gist}`);
    if (summary.outline) parts.push(`Outline:\n${summary.outline}`);
    if (summary.action_items) parts.push(`Action Items:\n${summary.action_items}`);
    if (summary.keywords) parts.push(`Keywords: ${summary.keywords}`);
    if (participants.length > 0) parts.push(`Attendees: ${participants.join(", ")}`);
    if (duration) parts.push(`Duration: ${Math.round(duration / 60)} minutes`);

    const rawContext = parts.join("\n\n");

    if (!rawContext.trim()) {
      console.log("[fireflies/webhook] Summary object present but all fields empty — skipping");
      return NextResponse.json({ ok: true, message: "No summary content, nothing to post" });
    }

    // Try Groq formatting — fall back to raw Fireflies content if unavailable or failing
    let body = rawContext;
    if (process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 600,
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                "You are a project management assistant for DEVCON+ Philippines. " +
                "Write a TL;DR meeting recap for Telegram.\n\n" +
                "Rules:\n" +
                "- One sentence: what the meeting decided or accomplished\n" +
                "- Bullet points covering all key decisions and updates — no fluff, no filler\n" +
                "- Action items prefixed with ✅ — include all that were clearly stated, one line each\n" +
                "- Be as brief as possible but leave nothing important out\n" +
                "- No greetings, sign-offs, or dates (added automatically)\n" +
                "- If there is nothing important to flag, say so in one line",
            },
            {
              role: "user",
              content: `Meeting: ${title}\nDate: ${dateStr}\n\n${rawContext}`,
            },
          ],
        });
        body = completion.choices[0]?.message?.content?.trim() || rawContext;
      } catch (groqErr) {
        console.warn("[fireflies/webhook] Groq formatting failed, using raw summary:", groqErr);
      }
    } else {
      console.warn("[fireflies/webhook] GROQ_API_KEY not set — saving raw Fireflies summary");
    }

    // Save as announcement in Supabase
    const supabase = createServiceRoleClient();
    const { data: announcement, error: dbError } = await supabase
      .from("announcements")
      .insert({
        title: `📋 Meeting Recap: ${title}`,
        body,
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("[fireflies/webhook] DB insert error:", dbError);
      return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
    }

    // Send to Telegram group chat
    const telegramText = [
      `📋 Meeting Recap: ${title}`,
      `📅 ${dateStr}`,
      ``,
      body,
      firefliesUrl ? `\n🔗 Full transcript: ${firefliesUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await sendTelegramMessage(telegramText);
    } catch (err) {
      console.error("[fireflies/webhook] Telegram send error:", err);
      return NextResponse.json(
        {
          ok: false,
          error: `Recap saved (id: ${(announcement as { id: string }).id}) but GC send failed: ${err instanceof Error ? err.message : String(err)}`,
        },
        { status: 500 }
      );
    }

    console.log(`[fireflies/webhook] Recap posted — announcement ${(announcement as { id: string }).id}`);
    return NextResponse.json({ ok: true, announcement_id: (announcement as { id: string }).id });
  } catch (err) {
    console.error("[fireflies/webhook] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
