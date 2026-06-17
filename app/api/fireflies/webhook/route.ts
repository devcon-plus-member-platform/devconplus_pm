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
  duration?: number;
  fireflies_url?: string;
  participants?: string[];
  summary?: FirefliesSummary;
  rawTranscript?: string; // populated when Fireflies has no summary
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
  transcript?: FirefliesTranscriptData & { id?: string };
}

interface FirefliesApiTranscript {
  id?: string;
  title?: string;
  date?: number;
  duration?: number;
  fireflies_url?: string;
  participants?: Array<string | { displayName?: string; email?: string }>;
  summary?: FirefliesSummary;
  sentences?: Array<{ text?: string; speaker_name?: string }>;
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
            date
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
            }
            sentences {
              text
              speaker_name
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

    const json = await res.json() as {
      data?: { transcript?: FirefliesApiTranscript };
      errors?: { message: string }[];
    };

    if (json?.errors?.length) {
      console.warn("[fireflies/webhook] Fireflies GraphQL errors:", JSON.stringify(json.errors));
    }

    const t = json?.data?.transcript;
    if (!t) return null;

    const dateIso = t.date ? new Date(t.date).toISOString() : undefined;

    const participants = Array.isArray(t.participants)
      ? t.participants.map((p) =>
          typeof p === "string" ? p : (p.displayName ?? p.email ?? "Unknown")
        )
      : [];

    // Build raw transcript text from sentences when Fireflies has no AI summary
    let rawTranscript: string | undefined;
    if (!t.summary && Array.isArray(t.sentences) && t.sentences.length > 0) {
      rawTranscript = t.sentences
        .map((s) => (s.speaker_name ? `${s.speaker_name}: ${s.text ?? ""}` : (s.text ?? "")))
        .filter(Boolean)
        .join("\n")
        .slice(0, 6000); // cap to avoid token limits
    }

    return {
      title: t.title,
      date: dateIso,
      duration: t.duration,
      fireflies_url: t.fireflies_url,
      participants,
      summary: t.summary,
      rawTranscript,
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

    if (!rawBody.trim()) {
      return NextResponse.json({ ok: true, message: "Ping acknowledged" });
    }

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

    const ACCEPTED_EVENTS = new Set([
      "Transcription completed",
      "Meeting summarized",
    ]);
    if (payload.eventType && !ACCEPTED_EVENTS.has(payload.eventType)) {
      console.log(`[fireflies/webhook] Skipping event type: ${payload.eventType}`);
      return NextResponse.json({ ok: true, message: `Skipped event: ${payload.eventType}` });
    }

    let data: FirefliesTranscriptData = payload.transcript ?? payload;

    // Fetch from Fireflies API when payload has no summary
    if (!data.summary) {
      const apiKey = process.env.FIREFLIES_API_KEY;
      const transcriptId = payload.meetingId ?? payload.transcript?.id;

      if (apiKey && transcriptId) {
        console.log(`[fireflies/webhook] Fetching from Fireflies API (id: ${transcriptId})`);
        const fetched = await fetchFirefliesTranscript(transcriptId, apiKey);
        if (fetched) {
          data = {
            title: fetched.title ?? data.title,
            date: fetched.date ?? data.date,
            duration: fetched.duration ?? data.duration,
            fireflies_url: fetched.fireflies_url ?? data.fireflies_url,
            participants: fetched.participants ?? data.participants,
            summary: fetched.summary,
            rawTranscript: fetched.rawTranscript,
          };
        }
      } else {
        if (!apiKey) console.warn("[fireflies/webhook] FIREFLIES_API_KEY not set");
        if (!transcriptId) console.warn("[fireflies/webhook] No meetingId in payload");
      }
    }

    const title = data.title ?? payload.title ?? "Team Meeting";
    const summary = data.summary ?? payload.summary;
    const duration = data.duration ?? payload.duration;
    const firefliesUrl = data.fireflies_url ?? payload.transcript_url ?? "";
    const participants = data.participants ?? payload.participants ?? [];
    const dateRaw = data.date ?? payload.date ?? new Date().toISOString();

    const dateStr = new Date(dateRaw).toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Manila",
    });

    // Build rawContext — from Fireflies summary fields, or fall back to raw transcript
    let rawContext = "";
    let usingRawTranscript = false;

    if (summary) {
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
      rawContext = parts.join("\n\n");
    } else if (data.rawTranscript?.trim()) {
      usingRawTranscript = true;
      rawContext = data.rawTranscript;
      console.log("[fireflies/webhook] No Fireflies summary — using raw transcript sentences");
    }

    if (!rawContext.trim()) {
      console.log("[fireflies/webhook] No usable content — skipping");
      return NextResponse.json({ ok: true, message: "No summary content, nothing to post" });
    }

    let body = rawContext;
    if (process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const systemPrompt = usingRawTranscript
          ? "You are a project management assistant for DEVCON+ Philippines. " +
            "Summarize the following meeting transcript into a TL;DR team announcement.\n\n" +
            "Rules:\n" +
            "- One sentence: what the meeting was about\n" +
            "- 2–3 bullet points (•) of the most important points\n" +
            "- ✅ action items if any were discussed — max 3\n" +
            "- Under 80 words total\n" +
            "- No greetings, sign-offs, or dates\n" +
            "- If the transcript has no meaningful content, respond with: 'No meaningful content to summarize.'"
          : "You are a project management assistant for DEVCON+ Philippines. " +
            "Write a TL;DR meeting recap for Telegram.\n\n" +
            "Rules:\n" +
            "- One sentence: what the meeting decided or accomplished\n" +
            "- 2–3 bullet points max — only the most important points\n" +
            "- Action items prefixed with ✅ — max 3, only if clearly stated\n" +
            "- Under 80 words total\n" +
            "- No greetings, sign-offs, or dates\n" +
            "- If there is nothing important to flag, say so in one line";

        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 200,
          temperature: 0.4,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Meeting: ${title}\nDate: ${dateStr}\n\n${rawContext}` },
          ],
        });
        body = completion.choices[0]?.message?.content?.trim() || rawContext;
      } catch (groqErr) {
        console.warn("[fireflies/webhook] Groq formatting failed, using raw summary:", groqErr);
      }
    }

    // Skip posting if Groq determined there's nothing meaningful
    if (body.toLowerCase().includes("no meaningful content")) {
      console.log("[fireflies/webhook] Groq flagged no meaningful content — skipping");
      return NextResponse.json({ ok: true, message: "No meaningful content to post" });
    }

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
          error: `Recap saved (id: ${(announcement as { id: string }).id}) but Telegram send failed: ${err instanceof Error ? err.message : String(err)}`,
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
