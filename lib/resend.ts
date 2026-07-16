import { sendMail } from "@/lib/mailer";

// Thin shim — keeps all existing call sites unchanged
const resend = {
  emails: {
    send: (opts: { from: string; to: string; subject: string; html: string }) =>
      sendMail({ to: opts.to, subject: opts.subject, html: opts.html }),
  },
};

function getResendClient() {
  return resend;
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
    from: process.env.RESEND_FROM_DOMAIN ? `DEVCON+ PM <noreply@${process.env.RESEND_FROM_DOMAIN}>` : "DEVCON+ PM <onboarding@resend.dev>",
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
    from: process.env.RESEND_FROM_DOMAIN ? `DEVCON+ PM <noreply@${process.env.RESEND_FROM_DOMAIN}>` : "DEVCON+ PM <onboarding@resend.dev>",
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
    from: process.env.RESEND_FROM_DOMAIN ? `DEVCON+ PM <noreply@${process.env.RESEND_FROM_DOMAIN}>` : "DEVCON+ PM <onboarding@resend.dev>",
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
    from: process.env.RESEND_FROM_DOMAIN ? `DEVCON+ PM <noreply@${process.env.RESEND_FROM_DOMAIN}>` : "DEVCON+ PM <onboarding@resend.dev>",
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
    from: process.env.RESEND_FROM_DOMAIN ? `DEVCON+ PM <noreply@${process.env.RESEND_FROM_DOMAIN}>` : "DEVCON+ PM <onboarding@resend.dev>",
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
    from: process.env.RESEND_FROM_DOMAIN ? `DEVCON+ PM <noreply@${process.env.RESEND_FROM_DOMAIN}>` : "DEVCON+ PM <onboarding@resend.dev>",
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
// ─── Task reminder ────────────────────────────────────────────────────────────
export interface TaskReminderEmailOptions {
  to: string;
  assigneeName: string;
  taskTitle: string;
  projectName: string;
  dueDate: string | null;
  reminderType: "3_days" | "1_day" | "due_today";
}

export async function sendTaskReminderEmail(opts: TaskReminderEmailOptions): Promise<void> {
  const resend = getResendClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const due = opts.dueDate
    ? new Date(opts.dueDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "Not set";
  const urgencyLabel =
    opts.reminderType === "due_today" ? "due TODAY"
    : opts.reminderType === "1_day"   ? "due TOMORROW"
    :                                   "due in 3 days";
  const borderColor =
    opts.reminderType === "due_today" ? "#ef4444"
    : opts.reminderType === "1_day"   ? "#f59e0b"
    :                                   "#3b82f6";

  await resend.emails.send({
    from: process.env.RESEND_FROM_DOMAIN ? `DEVCON+ PM <noreply@${process.env.RESEND_FROM_DOMAIN}>` : "DEVCON+ PM <onboarding@resend.dev>",
    to: opts.to,
    subject: `[Reminder] Task ${urgencyLabel}: ${opts.taskTitle}`,
    html: emailWrapper(`
      <p style="color:#374151;">Hi <strong>${opts.assigneeName}</strong>,</p>
      <p style="color:#374151;">This is a reminder that a task assigned to you is <strong>${urgencyLabel}</strong>.</p>
      <div style="margin:20px 0;padding:16px;background:#f9fafb;border-left:4px solid ${borderColor};border-radius:0 8px 8px 0;">
        <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#374151;">${opts.taskTitle}</p>
        <p style="margin:0;color:#6b7280;font-size:13px;">Project: ${opts.projectName} &mdash; Due: ${due}</p>
      </div>
      ${ctaButton(`${appUrl}/dashboard`, "View in DEVCON+ PM")}
    `),
  });
}

// ─── Activity alert (to admin) ────────────────────────────────────────────────
export interface ActivityAlertEmailOptions {
  to: string;
  actor: string;
  action: string;
  entity: string;
  entityTitle: string;
  page: string;
}

export async function sendActivityAlertEmail(opts: ActivityAlertEmailOptions): Promise<void> {
  const resend = getResendClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const borderColor =
    opts.action === "deleted" ? "#ef4444" :
    opts.action === "created" ? "#22c55e" : "#2234b0";

  await resend.emails.send({
    from: process.env.RESEND_FROM_DOMAIN ? `DEVCON+ PM <noreply@${process.env.RESEND_FROM_DOMAIN}>` : "DEVCON+ PM <onboarding@resend.dev>",
    to: opts.to,
    subject: `[DEVCON+ PM] ${opts.actor} ${opts.action} ${opts.entity}: ${opts.entityTitle}`,
    html: emailWrapper(`
      <p style="color:#374151;">Hi <strong>Admin</strong>,</p>
      <p style="color:#374151;">An activity was performed on the board:</p>
      <div style="margin:16px 0;padding:16px;background:#f9fafb;border-left:4px solid ${borderColor};border-radius:0 8px 8px 0;">
        <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#374151;">
          <strong>${opts.actor}</strong> ${opts.action} ${opts.entity}
        </p>
        <p style="margin:0;color:#6b7280;font-size:14px;">"${opts.entityTitle}" &mdash; ${opts.page}</p>
      </div>
      <p style="color:#9ca3af;font-size:12px;">
        Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })} PHT
      </p>
      ${ctaButton(`${appUrl}/dashboard`, "View Dashboard")}
    `),
  });
}

// ─── Welcome ──────────────────────────────────────────────────────────────────
export interface WelcomeEmailOptions {
  to: string;
  name: string;
}

export async function sendWelcomeEmail(opts: WelcomeEmailOptions): Promise<void> {
  const resend = getResendClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  await resend.emails.send({
    from: process.env.RESEND_FROM_DOMAIN ? `DEVCON+ PM <noreply@${process.env.RESEND_FROM_DOMAIN}>` : "DEVCON+ PM <onboarding@resend.dev>",
    to: opts.to,
    subject: "You've been added to DEVCON+ PM",
    html: emailWrapper(`
      <p style="color:#374151;">Hi <strong>${opts.name}</strong>,</p>
      <p style="color:#374151;">You now have access to the <strong>DEVCON+ PM</strong> project management dashboard.</p>
      <p style="color:#374151;">You can access the dashboard directly — no login required.</p>
      <ul style="color:#6b7280;font-size:14px;line-height:2;">
        <li>View and update tasks on the PM board</li>
        <li>Track QA test cases</li>
        <li>Receive team announcements</li>
      </ul>
      ${ctaButton(`${appUrl}/dashboard`, "Open DEVCON+ PM Dashboard")}
    `),
  });
}

// ─── Admin invite ──────────────────────────────────────────────────────────────
export interface AdminInviteEmailOptions {
  to: string;
  inviterName: string;
  acceptUrl: string;
}

export async function sendAdminInviteEmail(opts: AdminInviteEmailOptions): Promise<void> {
  const resend = getResendClient();

  await resend.emails.send({
    from: process.env.RESEND_FROM_DOMAIN ? `DEVCON+ PM <noreply@${process.env.RESEND_FROM_DOMAIN}>` : "DEVCON+ PM <onboarding@resend.dev>",
    to: opts.to,
    subject: "You've been invited as a DEVCON+ PM admin",
    html: emailWrapper(`
      <p style="color:#374151;">Hi there,</p>
      <p style="color:#374151;"><strong>${opts.inviterName}</strong> has invited you to become an admin on the <strong>DEVCON+ PM</strong> dashboard.</p>
      <p style="color:#374151;">Admins can see every contributor's tasks, manage the team, and receive activity alerts for the whole board.</p>
      <p style="color:#374151;">Click below to create your account with a name and password:</p>
      ${ctaButton(opts.acceptUrl, "Create your admin account")}
      <p style="color:#9ca3af;font-size:12px;margin-top:20px;">This invite link expires in 7 days. If you weren't expecting this, you can safely ignore this email.</p>
    `),
  });
}

// ─── Milestone achieved ────────────────────────────────────────────────────────
export interface MilestoneAchievedEmailOptions {
  to: string;
  recipientName: string;
  milestoneTitle: string;
  targetDate: string;
  achievedAt: string;
  description: string | null;
}

export async function sendMilestoneAchievedEmail(
  opts: MilestoneAchievedEmailOptions
): Promise<void> {
  const resend = getResendClient();

  const formattedTarget = new Date(opts.targetDate).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });
  const formattedAchieved = new Date(opts.achievedAt).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM_DOMAIN ? `DEVCON+ PM <noreply@${process.env.RESEND_FROM_DOMAIN}>` : "DEVCON+ PM <onboarding@resend.dev>",
    to: opts.to,
    subject: `🎉 Milestone Achieved: ${opts.milestoneTitle}`,
    html: emailWrapper(`
      <p style="color:#374151;">Hi <strong>${opts.recipientName}</strong>,</p>
      <p style="color:#374151;">Great news — the DEVCON+ team has achieved a milestone!</p>
      <div style="margin:20px 0;padding:20px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#15803d;">🏆 ${opts.milestoneTitle}</p>
        <p style="margin:4px 0;color:#374151;">📅 Target date: <strong>${formattedTarget}</strong></p>
        <p style="margin:4px 0;color:#374151;">✅ Achieved on: <strong>${formattedAchieved}</strong></p>
        ${opts.description ? `<p style="margin:8px 0 0;color:#374151;">📝 ${opts.description}</p>` : ""}
      </div>
      <p style="color:#374151;">This is the result of everyone's hard work and dedication. Keep up the great momentum as we push toward the full launch.</p>
      <p style="color:#6b7280;font-size:13px;">— DEVCON+ PM</p>
    `),
  });
}
