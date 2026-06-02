// supabase/functions/send-meeting-reminders/index.ts
// Scheduled every 15 minutes via Supabase Cron or external cron job.
// Finds meetings whose reminder window has arrived and sends email + Telegram DM.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface MeetingAttendeeRow {
  contributor_id: string;
  contributor: {
    email: string;
    full_name: string | null;
    telegram_username: string | null;
  };
}

interface MeetingRow {
  id: string;
  title: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  google_meet_link: string | null;
  reminder_minutes_before: number;
  attendees: MeetingAttendeeRow[];
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const now = new Date();

  // Fetch all upcoming, non-cancelled meetings
  const { data: meetings, error } = await supabase
    .from("meetings")
    .select(
      "id,title,meeting_date,start_time,end_time,timezone,google_meet_link,reminder_minutes_before," +
        "attendees:meeting_attendees(contributor_id,contributor:contributors(email,full_name,telegram_username))"
    )
    .eq("status", "Scheduled")
    .gte("meeting_date", now.toISOString().split("T")[0]);

  if (error) {
    console.error("[send-meeting-reminders] fetch error:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  const rows = (meetings ?? []) as unknown as MeetingRow[];

  let sent = 0;
  let skipped = 0;

  for (const meeting of rows) {
    // Parse meeting start as UTC-equivalent naive datetime
    const meetingStart = new Date(`${meeting.meeting_date}T${meeting.start_time}`);
    const reminderAt = new Date(meetingStart.getTime() - meeting.reminder_minutes_before * 60 * 1000);
    const windowEnd = new Date(reminderAt.getTime() + 15 * 60 * 1000);

    // Only send if now is within the reminder window
    if (now < reminderAt || now > windowEnd) {
      skipped++;
      continue;
    }

    const attendees = (meeting.attendees ?? []) as MeetingAttendeeRow[];

    for (const attendee of attendees) {
      const { email, full_name, telegram_username } = attendee.contributor ?? {};
      if (!email) continue;

      // Dedup: check if reminder already sent for this meeting+contributor
      const { data: existing } = await supabase
        .from("meeting_reminders")
        .select("id")
        .eq("meeting_id", meeting.id)
        .eq("contributor_id", attendee.contributor_id)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Send email reminder
      const meetLinkLine = meeting.google_meet_link
        ? `\nJoin: ${meeting.google_meet_link}`
        : "";

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "DEVCON+ PM <no-reply@devconplus.com>",
          to: email,
          subject: `😱 Kibot! ${meeting.title} starts in ${meeting.reminder_minutes_before} minutes`,
          html: `
            <p>Hi ${full_name ?? email},</p>
            <p>Sorry to kibot you — <strong>${meeting.title}</strong> starts in <strong>${meeting.reminder_minutes_before} minutes</strong>. Close that tab and go.</p>
            <p><strong>Date:</strong> ${meeting.meeting_date}<br/>
            <strong>Time:</strong> ${meeting.start_time.slice(0, 5)} – ${meeting.end_time.slice(0, 5)} (${meeting.timezone})${meetLinkLine}</p>
            <p>— Kibot 🤖, your DEVCON+ PM bot</p>
          `,
        }),
      }).catch((e) => console.warn("[send-meeting-reminders] email error:", e));

      // Send Telegram DM if username is linked
      if (telegram_username && TELEGRAM_BOT_TOKEN) {
        const text =
          `😱 Kibot! *${meeting.title}* starts in ${meeting.reminder_minutes_before} min\n` +
          `${meeting.meeting_date} at ${meeting.start_time.slice(0, 5)} (${meeting.timezone})` +
          (meeting.google_meet_link ? `\n[Join Meet](${meeting.google_meet_link})` : "") +
          `\n\n_Close that tab and go._`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: `@${telegram_username}`,
            text,
            parse_mode: "Markdown",
          }),
        }).catch((e) => console.warn("[send-meeting-reminders] telegram error:", e));
      }

      // Record that reminder was sent
      await supabase.from("meeting_reminders").insert({
        meeting_id: meeting.id,
        contributor_id: attendee.contributor_id,
        sent_at: now.toISOString(),
        channel: "email",
      });

      sent++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, skipped, total: rows.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
