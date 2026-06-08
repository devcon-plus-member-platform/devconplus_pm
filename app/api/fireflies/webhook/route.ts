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
  transcript?: {
    title?: string;
    date?: string;
    duration?: number;
    fireflies_url?: string;
    summary?: FirefliesSummary;
    participants?: string[];
  };
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(rawBody, "utf8");
    const computed = hmac.digest("hex");
    const provided = signature.replace(/^sha256=/, "");
    // Both must be the same length for timingSafeEqual
    if (computed.length !== provided.length) return false;
    return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify webhook signing secret if configured
    const webhookSecret = process.env.FIREFLIES_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature =
        request.headers.get("x-fireflies-signature") ??
        request.headers.get("x-hub-signature-256") ??
        request.headers.get("x-signature") ??
        "";

      if (!signature) {
        console.warn("[fireflies/webhook] Request missing signature header — rejected");
        return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 401 });
      }

      if (!verifySignature(rawBody, signature, webhookSecret)) {
        console.warn("[fireflies/webhook] Invalid signature — rejected");
        return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody) as FirefliesPayload;

    // Normalize: some plans nest data under payload.transcript
    const data = payload.transcript ?? payload;
    const title = data.title ?? payload.title ?? "Team Meeting";
    const summary = data.summary ?? payload.summary;
    const duration = data.duration ?? payload.duration;
    const firefliesUrl = data.fireflies_url ?? payload.transcript_url ?? "";
    const participants = data.participants ?? payload.participants ?? [];
    const dateRaw = data.date ?? payload.date ?? new Date().toISOString();

    // Skip if there's no summary content at all
    if (
      !summary ||
      (!summary.gist && !summary.short_summary && !summary.overview && !summary.bullet_gist)
    ) {
      console.log("[fireflies/webhook] No summary in payload — skipping");
      return NextResponse.json({ ok: true, message: "No summary content, nothing to post" });
    }

    // Build raw context for Groq
    const parts: string[] = [];
    if (summary.gist) parts.push(`Gist: ${summary.gist}`);
    if (summary.short_summary) parts.push(`Summary: ${summary.short_summary}`);
    if (summary.overview) parts.push(`Overview: ${summary.overview}`);
    if (summary.bullet_gist) parts.push(`Key Points:\n${summary.bullet_gist}`);
    if (summary.action_items) parts.push(`Action Items:\n${summary.action_items}`);
    if (summary.keywords) parts.push(`Keywords: ${summary.keywords}`);
    if (participants.length > 0) parts.push(`Attendees: ${participants.join(", ")}`);
    if (duration) parts.push(`Duration: ${Math.round(duration / 60)} minutes`);

    const rawContext = parts.join("\n\n");

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ ok: false, error: "GROQ_API_KEY not configured" }, { status: 503 });
    }

    const dateStr = new Date(dateRaw).toLocaleDateString("en-PH", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    // Use Groq to format as a clean announcement
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 500,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are a project management assistant for DEVCON+ Philippines. " +
            "Format the provided meeting summary into a clean team announcement.\n\n" +
            "Rules:\n" +
            "- One-line opening that captures what the meeting was about\n" +
            "- 3–5 key discussion points using • bullets\n" +
            "- Action items prefixed with ✅ (only if present in the data)\n" +
            "- Keep it under 220 words\n" +
            "- Friendly and concise — this is a tight-knit team\n" +
            "- Do NOT add greetings, sign-offs, or dates (those are added automatically)",
        },
        {
          role: "user",
          content: `Meeting: ${title}\nDate: ${dateStr}\n\n${rawContext}`,
        },
      ],
    });

    const body = completion.choices[0]?.message?.content?.trim() ?? rawContext;

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
        { ok: false, error: `Recap saved (id: ${(announcement as { id: string }).id}) but GC send failed: ${err instanceof Error ? err.message : String(err)}` },
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
