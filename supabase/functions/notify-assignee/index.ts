// Edge Function: notify-assignee
// Trigger: Database webhook on tasks INSERT/UPDATE when assignee_id changes
// Implemented in Batch 3

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface TaskWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
}

serve(async (req: Request) => {
  try {
    const payload: TaskWebhookPayload = await req.json();

    const { type, record, old_record } = payload;

    // Only act when assignee_id is newly set or changed
    const assigneeChanged =
      type === "INSERT"
        ? !!record.assignee_id
        : record.assignee_id !== old_record?.assignee_id;

    if (!assigneeChanged) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // TODO (Batch 3):
    // 1. Fetch assignee contributor record + email
    // 2. Send email via Resend
    // 3. Send Telegram DM if telegram_username is set

    console.log("[notify-assignee] stub called for task:", record.id);

    return new Response(JSON.stringify({ ok: true, stub: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-assignee] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
