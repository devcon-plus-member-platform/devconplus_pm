import { NextRequest, NextResponse } from "next/server";
import { webhookCallback } from "grammy";
import { getBot } from "@/lib/telegram";

// Grammy webhook handler — receives updates from Telegram and routes commands
export async function POST(request: NextRequest) {
  try {
    // Verify the secret token header set during webhook registration
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secretToken) {
      const header = request.headers.get("x-telegram-bot-api-secret-token");
      if (header !== secretToken) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const bot = getBot();
    const handleUpdate = webhookCallback(bot, "std/http");
    return handleUpdate(request);
  } catch (err) {
    console.error("[telegram webhook] error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
