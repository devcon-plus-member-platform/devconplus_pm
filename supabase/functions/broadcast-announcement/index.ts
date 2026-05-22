// Edge Function: broadcast-announcement
// Trigger: Database webhook on announcements UPDATE when sent_at is set (draft → published)
// Sends email to all contributors + posts to Telegram group
// Implemented in Batch 3

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AnnouncementWebhookPayload {
  type: "UPDATE";
  table: string;
  record: {
    id: string;
    title: string;
    body: string;
    sent_at: string | null;
    [key: string]: unknown;
  };
  old_record: {
    sent_at: string | null;
    [key: string]: unknown;
  } | null;
}

serve(async (req: Request) => {
  try {
    const payload: AnnouncementWebhookPayload = await req.json();
    const { record, old_record } = payload;

    // Only fire when sent_at transitions from null → set (draft → published)
    const justPublished = !old_record?.sent_at && !!record.sent_at;

    if (!justPublished) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: contributors, error } = await supabase
      .from("contributors")
      .select("email, full_name, telegram_username");

    if (error) throw error;

    console.log(
      `[broadcast-announcement] "${record.title}" → ${contributors?.length ?? 0} recipients`
    );

    // TODO (Batch 3):
    // 1. Send bulk email via Resend to all contributor emails
    // 2. Post to Telegram group chat

    return new Response(
      JSON.stringify({
        ok: true,
        stub: true,
        recipients: contributors?.length ?? 0,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[broadcast-announcement] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
