// Edge Function: notify-due-date
// Deploy with: supabase functions deploy notify-due-date
// Schedule: daily at 01:00 UTC (09:00 PHT, UTC+8) via Supabase cron
//
// SQL to register the schedule (run once in Supabase SQL editor):
//   select cron.schedule(
//     'notify-due-date-daily',
//     '0 1 * * *',
//     $$
//       select net.http_post(
//         url := current_setting('app.supabase_url') || '/functions/v1/notify-due-date',
//         headers := jsonb_build_object(
//           'Content-Type', 'application/json',
//           'Authorization', 'Bearer ' || current_setting('app.service_role_key')
//         ),
//         body := '{}'::jsonb
//       )
//     $$
//   );

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface TaskWithAssignee {
  id: string;
  title: string;
  status: string;
  due_date: string;
  assignee: {
    email: string;
    full_name: string | null;
  } | null;
}

async function sendDueReminderEmail(opts: {
  to: string;
  name: string;
  taskTitle: string;
  dueDate: string;
  status: string;
  appUrl: string;
}): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) throw new Error("RESEND_API_KEY not set");

  const formattedDate = new Date(opts.dueDate).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "DEVCON+ PM <onboarding@resend.dev>",
      to: opts.to,
      subject: `⏰ Task due tomorrow: ${opts.taskTitle}`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
  <div style="background:white;border-radius:8px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="margin:0 0 4px;color:#1e2970;font-size:20px;">DEVCON+ PM</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">Project Management Dashboard</p>
    <p style="color:#374151;">Hi <strong>${opts.name}</strong>,</p>
    <p style="color:#374151;">Your task <strong>&ldquo;${opts.taskTitle}&rdquo;</strong> is due tomorrow (${formattedDate}).</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151;width:30%;">Current Status</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">${opts.status}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Due Date</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">${formattedDate}</td>
      </tr>
    </table>
    <a href="${opts.appUrl}/dashboard" style="display:inline-block;margin-top:16px;padding:10px 22px;background:#2234b0;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Update in DEVCON+ PM &rarr;</a>
  </div>
  <p style="text-align:center;margin-top:16px;color:#9ca3af;font-size:12px;">DEVCON+ Philippines &middot; Sent by DEVCON+ PM</p>
</div>`,
    }),
  });
}

serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://your-app.vercel.app";

    // Tasks where due_date = tomorrow and not Done
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id,title,status,due_date,assignee:contributors(email,full_name)")
      .eq("due_date", tomorrowStr)
      .not("status", "eq", "Done")
      .not("assignee_id", "is", null);

    if (error) throw error;

    const rows = (tasks ?? []) as TaskWithAssignee[];
    console.log(`[notify-due-date] ${rows.length} tasks due tomorrow`);

    const results = await Promise.allSettled(
      rows
        .filter((t) => t.assignee?.email)
        .map((t) =>
          sendDueReminderEmail({
            to: t.assignee!.email,
            name: t.assignee!.full_name ?? t.assignee!.email,
            taskTitle: t.title,
            dueDate: t.due_date,
            status: t.status,
            appUrl,
          })
        )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`[notify-due-date] sent=${sent} failed=${failed}`);

    return new Response(
      JSON.stringify({ ok: true, total: rows.length, sent, failed }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[notify-due-date] error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
