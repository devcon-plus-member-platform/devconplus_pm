import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { sendTelegramMessage } from "@/lib/telegram";
import type { Announcement } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { announcement_id } = await req.json();
    if (!announcement_id) {
      return NextResponse.json({ ok: false, error: "announcement_id required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", announcement_id)
      .single<Announcement>();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Announcement not found" }, { status: 404 });
    }

    const text = `${data.title}\n\n${data.body}`.slice(0, 4096);

    await sendTelegramMessage(text);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[announce-gc]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
