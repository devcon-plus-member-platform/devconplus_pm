import { Resend } from "resend";

let _resend: Resend | null = null;

function getResendClient(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(apiKey);
  }
  return _resend;
}

// ─── Shared layout wrapper ─────────────────────────────────────────────────────
function emailWrapper(inner: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
  <div style="background:white;border-radius:8px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="margin:0 0 4px;color:#1e2970;font-size:20px;">DEVCON+ PM</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">Project Management Dashboard</p>
    ${inner}
  </div>
  <p style="text-align:center;margin-top:16px;color:#9ca3af;font-size:12px;">DEVCON+ Philippines &middot; Sent by DEVCON+ PM</p>
</div>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:16px;padding:10px 22px;background:#2234b0;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">${label} &rarr;</a>`;
}

// ─── Task assigned ─────────────────────────────────────────────────────────────
export interface TaskAssignedEmailOptions {
  to: string;
  assigneeName: string;
  taskTitle: string;
  status: string;
  dueDate: string | null;
}

export async function sendTaskAssignedEmail(opts: TaskAssignedEmailOptions): Promise<void> {
  const resend = getResendClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const due = opts.dueDate
    ? new Date(opts.dueDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "Not set";

  await resend.emails.send({
    from: "DEVCON+ PM <onboarding@resend.dev>",
    to: opts.to,
    subject: `You've been assigned: ${opts.taskTitle}`,
    html: emailWrapper(`
      <p style="color:#374151;">Hi <strong>${opts.assigneeName}</strong>,</p>
      <p style="color:#374151;">You have been assigned the task <strong>&ldquo;${opts.taskTitle}&rdquo;</strong> in DEVCON+ PM.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151;width:30%;">Status</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">${opts.status}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Due Date</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">${due}</td>
        </tr>
      </table>
      ${ctaButton(`${appUrl}/dashboard`, "View in DEVCON+ PM")}
    `),
  });
}

// ─── Announcement broadcast ────────────────────────────────────────────────────
export interface AnnouncementEmailOptions {
  to: string;
  recipientName: string;
  announcementTitle: string;
  announcementBody: string;
}

export async function sendAnnouncementEmail(opts: AnnouncementEmailOptions): Promise<void> {
  const resend = getResendClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Preserve line breaks in HTML body
  const bodyHtml = opts.announcementBody
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .join("<br/>");

  await resend.emails.send({
    from: "DEVCON+ PM <onboarding@resend.dev>",
    to: opts.to,
    subject: `[DEVCON+ PM] ${opts.announcementTitle}`,
    html: emailWrapper(`
      <p style="color:#374151;">Hi <strong>${opts.recipientName}</strong>,</p>
      <div style="margin:16px 0;padding:16px;background:#f8faff;border-left:4px solid #2234b0;border-radius:0 8px 8px 0;">
        <h3 style="margin:0 0 8px;color:#1e2970;font-size:16px;">${opts.announcementTitle}</h3>
        <p style="margin:0;color:#374151;line-height:1.6;">${bodyHtml}</p>
      </div>
      ${ctaButton(`${appUrl}/announcements`, "View Announcements")}
    `),
  });
}

// ─── Bug assigned ─────────────────────────────────────────────────────────────
export interface BugAssignedEmailOptions {
  to: string;
  assigneeName: string;
  bugTitle: string;
  severity: string;
  environment: string | null;
  description: string;
  bugId: string;
}

export async function sendBugAssignedEmail(opts: BugAssignedEmailOptions): Promise<void> {
  const resend = getResendClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  await resend.emails.send({
    from: "DEVCON+ PM <onboarding@resend.dev>",
    to: opts.to,
    subject: `[DEVCON+ PM] Bug assigned to you: ${opts.bugTitle}`,
    html: emailWrapper(`
      <p style="color:#374151;">Hi <strong>${opts.assigneeName}</strong>,</p>
      <p style="color:#374151;">A <strong>${opts.severity}</strong> severity bug has been assigned to you.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151;width:30%;">Title</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">${opts.bugTitle}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Severity</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">${opts.severity}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Environment</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">${opts.environment ?? "Not specified"}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Description</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">${opts.description.slice(0, 200)}${opts.description.length > 200 ? "…" : ""}</td>
        </tr>
      </table>
      ${ctaButton(`${appUrl}/bugs#${opts.bugId}`, "View Bug")}
    `),
  });
}

// ─── Meeting confirmation ──────────────────────────────────────────────────────
export interface MeetingConfirmationEmailOptions {
  to: string;
  recipientName: string;
  title: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  recurrence: string;
  description: string | null;
  meetLink: string | null;
}

export async function sendMeetingConfirmationEmail(
  opts: MeetingConfirmationEmailOptions
): Promise<void> {
  const resend = getResendClient();

  const formattedDate = new Date(opts.meetingDate).toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const recurrenceLabel =
    opts.recurrence === "None" ? "One-time" : opts.recurrence;

  await resend.emails.send({
    from: "DEVCON+ PM <onboarding@resend.dev>",
    to: opts.to,
    subject: `📅 Meeting scheduled: ${opts.title}`,
    html: emailWrapper(`
      <p style="color:#374151;">Hi <strong>${opts.recipientName}</strong>,</p>
      <p style="color:#374151;">A meeting has been scheduled for you.</p>
      <div style="margin:20px 0;padding:20px;background:#f8faff;border-left:4px solid #2234b0;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#1e2970;">📌 ${opts.title}</p>
        <p style="margin:4px 0;color:#374151;">🗓 ${formattedDate} at ${opts.startTime} – ${opts.endTime} ${opts.timezone}</p>
        <p style="margin:4px 0;color:#374151;">🔁 Recurrence: ${recurrenceLabel}</p>
        ${opts.description ? `<p style="margin:8px 0 4px;color:#374151;">📝 ${opts.description}</p>` : ""}
        ${opts.meetLink ? `<p style="margin:8px 0 4px;color:#374151;">🎥 Google Meet: <a href="${opts.meetLink}" style="color:#2234b0;">${opts.meetLink}</a></p>` : ""}
      </div>
      <p style="color:#6b7280;font-size:13px;">This event has been added to your Google Calendar automatically. See you there!</p>
    `),
  });
}

// ─── Meeting cancellation ──────────────────────────────────────────────────────
export interface MeetingCancellationEmailOptions {
  to: string;
  recipientName: string;
  title: string;
  meetingDate: string;
  startTime: string;
}

export async function sendMeetingCancellationEmail(
  opts: MeetingCancellationEmailOptions
): Promise<void> {
  const resend = getResendClient();

  const formattedDate = new Date(opts.meetingDate).toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  await resend.emails.send({
    from: "DEVCON+ PM <onboarding@resend.dev>",
    to: opts.to,
    subject: `❌ Meeting cancelled: ${opts.title}`,
    html: emailWrapper(`
      <p style="color:#374151;">Hi <strong>${opts.recipientName}</strong>,</p>
      <p style="color:#374151;">The following meeting has been <strong>cancelled</strong>:</p>
      <div style="margin:20px 0;padding:16px;background:#fff5f5;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#374151;">${opts.title}</p>
        <p style="margin:0;color:#6b7280;">${formattedDate} at ${opts.startTime}</p>
      </div>
    `),
  });
}

// ─── Meeting reminder ──────────────────────────────────────────────────────────
export interface MeetingReminderEmailOptions {
  to: string;
  recipientName: string;
  title: string;
  startTime: string;
  timezone: string;
  minutesBefore: number;
  meetLink: string | null;
}

export async function sendMeetingReminderEmail(
  opts: MeetingReminderEmailOptions
): Promise<void> {
  const resend = getResendClient();

  await resend.emails.send({
    from: "DEVCON+ PM <onboarding@resend.dev>",
    to: opts.to,
    subject: `⏰ Meeting starting soon: ${opts.title}`,
    html: emailWrapper(`
      <p style="color:#374151;">Hi <strong>${opts.recipientName}</strong>,</p>
      <p style="color:#374151;">Your meeting is starting in <strong>${opts.minutesBefore} minutes</strong>.</p>
      <div style="margin:20px 0;padding:16px;background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#374151;">📌 ${opts.title}</p>
        <p style="margin:4px 0;color:#374151;">🕐 ${opts.startTime} ${opts.timezone}</p>
        ${opts.meetLink ? `<p style="margin:4px 0;color:#374151;">🎥 <a href="${opts.meetLink}" style="color:#2234b0;font-weight:600;">Join Google Meet</a></p>` : ""}
      </div>
    `),
  });
}
export interface WelcomeEmailOptions {
  to: string;
  name: string;
}

export async function sendWelcomeEmail(opts: WelcomeEmailOptions): Promise<void> {
  const resend = getResendClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  await resend.emails.send({
    from: "DEVCON+ PM <onboarding@resend.dev>",
    to: opts.to,
    subject: "You've been added to DEVCON+ PM",
    html: emailWrapper(`
      <p style="color:#374151;">Hi <strong>${opts.name}</strong>,</p>
      <p style="color:#374151;">You now have access to the <strong>DEVCON+ PM</strong> project management dashboard.</p>
      <p style="color:#374151;">Log in using your email address: <strong>${opts.to}</strong></p>
      <ul style="color:#6b7280;font-size:14px;line-height:2;">
        <li>View and update tasks on the PM board</li>
        <li>Track QA test cases</li>
        <li>Receive team announcements</li>
      </ul>
      ${ctaButton(`${appUrl}/login`, "Log in to DEVCON+ PM")}
    `),
  });
}
