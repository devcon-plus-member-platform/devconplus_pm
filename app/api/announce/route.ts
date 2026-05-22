import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { sendAnnouncementEmail } from "@/lib/resend";
import type { Contributor, Announcement } from "@/types";

interface AnnouncePayload {
  announcement_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const { announcement_id }: AnnouncePayload = await request.json();
    if (!announcement_id) {
      return NextResponse.json({ ok: false, error: "announcement_id required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch the announcement
    const { data: announcement, error: annErr } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", announcement_id)
      .single<Announcement>();

    if (annErr || !announcement) {
      return NextResponse.json({ ok: false, error: "Announcement not found" }, { status: 404 });
    }

    // Fetch all active contributors
    const { data: contributors, error: cErr } = await supabase
      .from("contributors")
      .select("id, email, full_name, deleted_at")
      .is("deleted_at", null);

    if (cErr) {
      return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
    }

    const active = (contributors as Contributor[]) ?? [];

    // Mark announcement as sent
    await supabase
      .from("announcements")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", announcement_id);

    // Send emails — fire all in parallel, log individual failures
    const results = await Promise.allSettled(
      active.map((c) =>
        sendAnnouncementEmail({
          to: c.email,
          recipientName: c.full_name ?? c.email,
          announcementTitle: announcement.title,
          announcementBody: announcement.body,
        })
      )
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      console.error(`[announce] ${failed}/${active.length} emails failed`);
    }

    return NextResponse.json({
      ok: true,
      sent: active.length - failed,
      failed,
      total: active.length,
    });
  } catch (err) {
    console.error("[announce]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
