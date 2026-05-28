import { Bot, InlineKeyboard } from "grammy";
import Groq from "groq-sdk";
import { createServiceRoleClient } from "@/lib/supabase";
import type { TaskStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContributorRow {
  id: string;
  email: string;
  full_name: string | null;
  role_id: string | null;
  deleted_at: string | null;
  role: { name: string } | null;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  project: { name: string } | null;
  group?: { name: string } | null;
}

interface BoardTaskRow {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  project: { name: string } | null;
  assignee: { id: string; full_name: string | null; email: string } | null;
}

interface QATestRow {
  id: string;
  title: string;
  status: string;
  category: string | null;
  bug_report: string | null;
  project: { name: string } | null;
  assignee: { full_name: string | null; email: string } | null;
}

interface BugRow {
  id: string;
  title: string;
  severity: string;
  status: string;
  project: { name: string } | null;
  assignee: { full_name: string | null; email: string } | null;
}

interface ContributorRow2 {
  id: string;
  full_name: string | null;
  email: string;
  role: { name: string; color: string | null } | null;
}

interface MeetingRow {
  id: string;
  title: string;
  type: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  google_meet_link: string | null;
}

interface MilestoneRow {
  id: string;
  title: string;
  status: string;
  target_date: string;
  progress: Array<{ progress_percent: number; progress_note: string; logged_date: string }>;
}

interface EssentialSectionRow {
  id: string;
  title: string;
  icon: string | null;
  entries: Array<{ id: string; label: string; data_type: string; value_text: string | null; note: string | null }>;
}

// ─── Voice helpers ────────────────────────────────────────────────────────────

interface VoiceIntent {
  action: "create_task" | "update_status" | "unknown";
  task_title?: string;
  project_name?: string;
  group_name?: string;
  assignee_name?: string;
  status?: string;
  task_keyword?: string;
  new_status?: string;
  reply?: string;
}

async function transcribeVoice(buffer: Buffer): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const audioFile = new File([new Uint8Array(buffer)], "voice.ogg", { type: "audio/ogg" });
  const result = await groq.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-large-v3",
  });
  return result.text.trim();
}

async function parseVoiceIntent(
  transcript: string,
  contributor: ContributorRow,
  myTasks: Array<{ title: string; status: string }>,
  projects: Array<{ name: string }>,
  team: Array<{ full_name: string | null; email: string }>
): Promise<VoiceIntent> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const ctx = [
    `Contributor: ${contributor.full_name ?? contributor.email}`,
    `Active tasks: ${myTasks.map((t) => `"${t.title}" (${t.status})`).join(", ") || "none"}`,
    `Projects: ${projects.map((p) => p.name).join(", ") || "none"}`,
    `Team: ${team.map((m) => m.full_name ?? m.email).join(", ") || "none"}`,
  ].join("\n");

  const msg = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 300,
    messages: [{
      role: "user",
      content:
        `Parse this Telegram voice command. Return ONLY valid JSON, no markdown.\n\n` +
        `Context:\n${ctx}\n\n` +
        `Voice: "${transcript}"\n\n` +
        `Schema: {"action":"create_task"|"update_status"|"unknown","task_title":"...","project_name":"...","group_name":"...","assignee_name":"...","status":"...","task_keyword":"...","new_status":"...","reply":"..."}\n` +
        `Valid statuses: "Not Started","In Progress","Done","Help","I am Stuck","For Improvements"\n` +
        `create_task: fill task_title (required), optionally project_name, group_name, assignee_name, status\n` +
        `update_status: fill task_keyword (words from task title), new_status\n` +
        `reply: one friendly confirmation line\n` +
        `If unclear: action="unknown", reply=what you understood`,
    }],
  });

  const raw = msg.choices[0]?.message?.content?.trim() ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in Groq response");
  return JSON.parse(match[0]) as VoiceIntent;
}

// ─── Bot singleton ────────────────────────────────────────────────────────────

let _bot: Bot | null = null;

export async function getBot(): Promise<Bot> {
  if (!_bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
    _bot = new Bot(token);
    registerHandlers(_bot);
    await _bot.init(); // required in serverless — loads bot username so group commands match correctly
  }
  return _bot;
}

// ─── Contributor lookup ───────────────────────────────────────────────────────

async function getContributor(telegramUsername: string): Promise<ContributorRow | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("contributors")
    .select("id,email,full_name,role_id,deleted_at,role:roles!role_id(name)")
    .eq("telegram_username", telegramUsername)
    .is("deleted_at", null)
    .single();
  return (data as unknown as ContributorRow) ?? null;
}

function notLinkedMessage(): string {
  return (
    "Your Telegram username is not linked to a DEVCON+ PM account.\n" +
    "Ask your PM to add your Telegram username in the Contributors page."
  );
}

function formatDue(due: string | null): string {
  if (!due) return "No due date";
  return new Date(due).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Command handlers ─────────────────────────────────────────────────────────

function registerHandlers(bot: Bot) {
  // /help
  bot.command("help", (ctx) => {
    ctx.reply(
      "📖 *DEVCON\\+ PM Bot Commands*\n\n" +
        "*🎙️ Voice Commands*\n" +
        "Send a voice message to create or update tasks naturally\\.\n" +
        'Examples: "Create a task called fix login bug" · "Mark the deploy task as done"\n\n' +
        "*Board & Tasks*\n" +
        "/board — Full task board grouped by assignee\n" +
        "/mytasks — Your currently assigned tasks\n" +
        "/deadlines — Your tasks due in the next 7 days\n" +
        "/status <keyword> — Search & update a task status\n" +
        "/standup — Your active tasks for standup\n\n" +
        "*QA & Bugs*\n" +
        "/qa — QA test summary by project\n" +
        "/qastatus — Search & update a QA test status\n" +
        "/bugs — Open & in\\-progress bugs by severity\n\n" +
        "*Team & Planning*\n" +
        "/meetings — Your upcoming meetings this week\n" +
        "/milestones — Current milestone status & progress\n" +
        "/team — Team members and roles\n" +
        "/essentials [term] — Browse or search the essentials wiki\n\n" +
        "*PM Only*\n" +
        "/announce <message> — Send announcement to all contributors\n\n" +
        "/help — Show this message",
      { parse_mode: "MarkdownV2" }
    );
  });

  // /board — all open tasks grouped by assignee
  bot.command("board", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const supabase = createServiceRoleClient();
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id,title,status,due_date,project:projects!project_id(name),assignee:contributors!assignee_id(id,full_name,email)")
      .not("status", "eq", "Done")
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("[/board]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const rows = (tasks ?? []) as unknown as BoardTaskRow[];

    if (rows.length === 0) {
      return ctx.reply("No open tasks on the board right now. 🎉");
    }

    // Group by assignee
    const grouped = new Map<string, { name: string; tasks: BoardTaskRow[] }>();
    const unassigned: BoardTaskRow[] = [];

    for (const task of rows) {
      if (!task.assignee) {
        unassigned.push(task);
      } else {
        const key = task.assignee.id;
        if (!grouped.has(key)) {
          grouped.set(key, { name: task.assignee.full_name ?? task.assignee.email, tasks: [] });
        }
        grouped.get(key)!.tasks.push(task);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatTaskLine = (t: BoardTaskRow): string => {
      const due = t.due_date ? `Due ${formatDue(t.due_date)}` : "No due date";
      const isOverdue = t.due_date && new Date(new Date(t.due_date).toDateString()) < today;
      const flag = isOverdue ? " ⚠️" : "";
      return `  • ${t.title} — ${t.status} — ${due}${flag}`;
    };

    const sections: string[] = [];

    for (const { name, tasks: assigneeTasks } of Array.from(grouped.values())) {
      const lines = assigneeTasks.slice(0, 10).map(formatTaskLine);
      const more = assigneeTasks.length > 10 ? `\n  …+${assigneeTasks.length - 10} more` : "";
      sections.push(`👤 ${name} (${assigneeTasks.length})\n${lines.join("\n")}${more}`);
    }

    if (unassigned.length > 0) {
      const lines = unassigned.slice(0, 5).map((t) => {
        const project = t.project?.name ? ` [${t.project.name}]` : "";
        return `  • ${t.title}${project} — ${t.status}`;
      });
      const more = unassigned.length > 5 ? `\n  …+${unassigned.length - 5} more` : "";
      sections.push(`📭 Unassigned (${unassigned.length})\n${lines.join("\n")}${more}`);
    }

    const header = `📋 Task Board — ${rows.length} open task${rows.length !== 1 ? "s" : ""}\n\n`;

    // Send in chunks if needed (Telegram 4096 char limit)
    const chunks: string[] = [];
    let current = header;
    for (const section of sections) {
      const candidate = current === header ? header + section : current + "\n\n" + section;
      if (candidate.length > 4000) {
        chunks.push(current);
        current = section;
      } else {
        current = candidate;
      }
    }
    chunks.push(current);

    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  });

  // /mytasks
  bot.command("mytasks", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) {
      return ctx.reply("Could not determine your Telegram username. Please set one in Telegram settings.");
    }

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const supabase = createServiceRoleClient();
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id,title,status,due_date,project:projects!project_id(name),group:groups!group_id(name)")
      .contains("assignee_ids", [contributor.id])
      .not("status", "eq", "Done")
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("[/mytasks]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const rows = tasks as unknown as TaskRow[];

    if (!rows || rows.length === 0) {
      return ctx.reply("You have no assigned tasks right now. 🎉");
    }

    const lines = rows.map((t, i) => {
      const due = formatDue(t.due_date);
      const project = t.project?.name ?? "Unknown";
      const group = t.group?.name ?? "Unknown";
      return (
        `${i + 1}. ${t.title} — ${t.status} — Due: ${due}\n` +
        `   Project: ${project} | Group: ${group}`
      );
    });

    await ctx.reply(`📋 Your open tasks:\n\n${lines.join("\n\n")}`);
  });

  // /deadlines
  bot.command("deadlines", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) {
      return ctx.reply("Could not determine your Telegram username.");
    }

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const now = new Date();
    const sevenDays = new Date();
    sevenDays.setDate(now.getDate() + 7);

    const supabase = createServiceRoleClient();
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id,title,status,due_date,project:projects!project_id(name)")
      .contains("assignee_ids", [contributor.id])
      .not("status", "eq", "Done")
      .gte("due_date", now.toISOString().split("T")[0])
      .lte("due_date", sevenDays.toISOString().split("T")[0])
      .order("due_date", { ascending: true });

    if (error) {
      console.error("[/deadlines]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const rows = tasks as unknown as TaskRow[];

    if (!rows || rows.length === 0) {
      return ctx.reply("No deadlines in the next 7 days. You're all good! ✅");
    }

    const lines = rows.map(
      (t) => `• ${t.title} — Due ${formatDue(t.due_date)} — ${t.status}`
    );

    await ctx.reply(`⏰ Upcoming deadlines (next 7 days):\n\n${lines.join("\n")}`);
  });

  // /status [keyword] — inline keyboards keep state in callback data (stateless)
  bot.command("status", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) {
      return ctx.reply("Could not determine your Telegram username.");
    }

    const keyword = ctx.match?.trim();
    if (!keyword) {
      return ctx.reply("Usage: /status <task keyword>\nExample: /status login page");
    }

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const supabase = createServiceRoleClient();
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id,title,status,due_date")
      .contains("assignee_ids", [contributor.id])
      .ilike("title", `%${keyword}%`)
      .limit(5);

    if (error) {
      console.error("[/status search]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    if (!tasks || tasks.length === 0) {
      return ctx.reply(`No tasks found matching "${keyword}". Try a different keyword.`);
    }

    if (tasks.length === 1) {
      await ctx.reply(
        `Found: ${(tasks[0] as unknown as TaskRow).title}\n\nUpdate status to:`,
        { reply_markup: buildStatusKeyboard(tasks[0].id) }
      );
    } else {
      const keyboard = new InlineKeyboard();
      (tasks as unknown as TaskRow[]).forEach((t) => {
        keyboard.text(t.title.slice(0, 64), `pick_task:${t.id}`).row();
      });
      await ctx.reply(`Found ${tasks.length} matching tasks. Which one?`, {
        reply_markup: keyboard,
      });
    }
  });

  // Callback: user picked a task → show status picker
  bot.callbackQuery(/^pick_task:(.+)$/, async (ctx) => {
    const taskId = ctx.match[1];
    const supabase = createServiceRoleClient();
    const { data: task } = await supabase
      .from("tasks")
      .select("id,title,status")
      .eq("id", taskId)
      .single();

    await ctx.answerCallbackQuery();

    if (!task) {
      return ctx.editMessageText("Task not found. It may have been deleted.");
    }

    await ctx.editMessageText(
      `Task: ${(task as unknown as TaskRow).title}\n\nUpdate status to:`,
      { reply_markup: buildStatusKeyboard(taskId) }
    );
  });

  // Callback: user picked a status → update DB
  bot.callbackQuery(/^set_status:(.+):(.+)$/, async (ctx) => {
    const taskId = ctx.match[1];
    const newStatus = decodeURIComponent(ctx.match[2]) as TaskStatus;

    const supabase = createServiceRoleClient();
    const { data: task, error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId)
      .select("id,title,status")
      .single();

    await ctx.answerCallbackQuery();

    if (error || !task) {
      console.error("[/status update]", error);
      return ctx.editMessageText(
        "Something went wrong. Please try again or check the dashboard."
      );
    }

    await ctx.editMessageText(
      `✅ Updated "${(task as unknown as TaskRow).title}" → ${newStatus}`
    );
  });

  // /qastatus [keyword] — search & update a QA test status
  bot.command("qastatus", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const keyword = ctx.match?.trim();
    if (!keyword) {
      return ctx.reply("Usage: /qastatus <test keyword>\nExample: /qastatus login flow");
    }

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const supabase = createServiceRoleClient();
    const { data: tests, error } = await supabase
      .from("qa_tests")
      .select("id,title,status,category")
      .eq("assigned_to", contributor.id)
      .ilike("title", `%${keyword}%`)
      .limit(5);

    if (error) {
      console.error("[/qastatus]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    if (!tests || tests.length === 0) {
      return ctx.reply(`No QA tests found matching "${keyword}". Try a different keyword.`);
    }

    if (tests.length === 1) {
      const t = tests[0] as unknown as QATestRow;
      const cat = t.category ? ` [${t.category}]` : "";
      await ctx.reply(
        `Found: ${t.title}${cat}\nCurrent status: ${t.status}\n\nUpdate status to:`,
        { reply_markup: buildQAStatusKeyboard(t.id) }
      );
    } else {
      const keyboard = new InlineKeyboard();
      (tests as unknown as QATestRow[]).forEach((t) => {
        const cat = t.category ? ` [${t.category}]` : "";
        keyboard.text(`${t.title.slice(0, 55)}${cat}`, `pick_qa:${t.id}`).row();
      });
      await ctx.reply(`Found ${tests.length} matching QA tests. Which one?`, {
        reply_markup: keyboard,
      });
    }
  });

  // Callback: user picked a QA test → show status picker
  bot.callbackQuery(/^pick_qa:(.+)$/, async (ctx) => {
    const testId = ctx.match[1];
    const supabase = createServiceRoleClient();
    const { data: test } = await supabase
      .from("qa_tests")
      .select("id,title,status,category")
      .eq("id", testId)
      .single();

    await ctx.answerCallbackQuery();

    if (!test) return ctx.editMessageText("QA test not found. It may have been deleted.");

    const t = test as unknown as QATestRow;
    const cat = t.category ? ` [${t.category}]` : "";
    await ctx.editMessageText(
      `Test: ${t.title}${cat}\nCurrent status: ${t.status}\n\nUpdate status to:`,
      { reply_markup: buildQAStatusKeyboard(testId) }
    );
  });

  // Callback: user picked a QA status → update DB
  bot.callbackQuery(/^set_qa_status:(.+):(.+)$/, async (ctx) => {
    const testId = ctx.match[1];
    const newStatus = decodeURIComponent(ctx.match[2]);

    const supabase = createServiceRoleClient();
    const { data: test, error } = await supabase
      .from("qa_tests")
      .update({ status: newStatus })
      .eq("id", testId)
      .select("id,title,status")
      .single();

    await ctx.answerCallbackQuery();

    if (error || !test) {
      console.error("[/qastatus update]", error);
      return ctx.editMessageText("Something went wrong. Please try again or check the dashboard.");
    }

    const t = test as unknown as QATestRow;
    const emoji: Record<string, string> = {
      Pass: "✅", Fail: "❌", Blocked: "🚫", "Not Run": "⬜",
    };
    await ctx.editMessageText(
      `${emoji[newStatus] ?? "🔄"} Updated "${t.title}" → ${newStatus}`
    );
  });

  // /announce [message]
  bot.command("announce", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) {
      return ctx.reply("Could not determine your Telegram username.");
    }

    const message = ctx.match?.trim();
    if (!message) {
      return ctx.reply(
        "Usage: /announce <message>\nExample: /announce Sprint 3 starts Monday!"
      );
    }

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    // Check PM role
    const roleName = contributor.role?.name?.toLowerCase() ?? "";
    const isPM =
      roleName.includes("product manager") || roleName.includes("project manager");

    if (!isPM) {
      return ctx.reply("Only Project Managers can send announcements.");
    }

    const supabase = createServiceRoleClient();

    const { data: announcement, error: insertError } = await supabase
      .from("announcements")
      .insert({
        title: `Telegram Announcement from @${username}`,
        body: message,
        created_by: contributor.id,
      })
      .select("id")
      .single();

    if (insertError || !announcement) {
      console.error("[/announce insert]", insertError);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/announce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcement_id: (announcement as { id: string }).id }),
    });
    const json = await res.json();

    if (!json.ok) {
      return ctx.reply(`Failed to send: ${json.error ?? "unknown error"}`);
    }

    await ctx.reply(
      `📣 Announcement sent to ${json.sent} contributor${json.sent !== 1 ? "s" : ""}.`
    );
  });

  // /meetings — list the contributor's upcoming meetings (next 7 days)
  bot.command("meetings", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const now = new Date();
    const sevenDays = new Date();
    sevenDays.setDate(now.getDate() + 7);
    const todayStr = now.toISOString().split("T")[0];
    const endStr = sevenDays.toISOString().split("T")[0];

    const supabase = createServiceRoleClient();
    const { data: attendeeRows, error } = await supabase
      .from("meeting_attendees")
      .select("meeting:meetings!meeting_id(id,title,type,meeting_date,start_time,end_time,timezone,google_meet_link)")
      .eq("contributor_id", contributor.id)
      .gte("meeting.meeting_date", todayStr)
      .lte("meeting.meeting_date", endStr)
      .eq("meeting.status", "Scheduled");

    if (error) {
      console.error("[/meetings]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const meetings = (attendeeRows ?? [])
      .map((r) => r.meeting)
      .filter(Boolean) as unknown as MeetingRow[];

    if (meetings.length === 0) {
      return ctx.reply("No meetings scheduled in the next 7 days. 📅");
    }

    meetings.sort((a, b) => a.meeting_date.localeCompare(b.meeting_date) || a.start_time.localeCompare(b.start_time));

    const lines = meetings.map((m) => {
      const date = new Date(m.meeting_date + "T00:00:00").toLocaleDateString("en-PH", {
        weekday: "short", month: "short", day: "numeric",
      });
      const time = `${m.start_time.slice(0, 5)} – ${m.end_time.slice(0, 5)}`;
      const link = m.google_meet_link ? `\n   🔗 ${m.google_meet_link}` : "";
      return `• [${m.type}] ${m.title}\n   ${date} at ${time} (${m.timezone})${link}`;
    });

    await ctx.reply(`📅 Your upcoming meetings:\n\n${lines.join("\n\n")}`);
  });

  // /standup — prompt contributor to post today's standup update
  bot.command("standup", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const supabase = createServiceRoleClient();
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id,title,status")
      .contains("assignee_ids", [contributor.id])
      .not("status", "eq", "Done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5);

    const rows = (tasks as unknown as TaskRow[]) ?? [];

    const greeting = `Good day, ${contributor.full_name ?? contributor.email}! 👋\n\nHere are your active tasks:\n`;
    const taskLines = rows.length > 0
      ? rows.map((t, i) => `${i + 1}. ${t.title} — ${t.status}`).join("\n")
      : "No active tasks right now.";

    await ctx.reply(
      greeting + taskLines +
      "\n\nUse /status <keyword> to update any task, or head to the dashboard for full details."
    );
  });

  // /milestones — show current milestone statuses and progress
  bot.command("milestones", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("milestones")
      .select("id,title,status,target_date,progress:milestone_progress!milestone_id(progress_percent,progress_note,logged_date)")
      .not("status", "in", '("Achieved","Missed")')
      .order("target_date", { ascending: true })
      .limit(10);

    if (error) {
      console.error("[/milestones]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const milestones = (data as unknown as MilestoneRow[]) ?? [];

    if (milestones.length === 0) {
      return ctx.reply("No active milestones right now.");
    }

    const lines = milestones.map((m) => {
      const sortedProgress = [...(m.progress ?? [])].sort((a, b) => b.logged_date.localeCompare(a.logged_date));
      const latest = sortedProgress[0];
      const pct = latest?.progress_percent ?? 0;
      const note = latest?.progress_note ? `"${latest.progress_note.slice(0, 80)}${latest.progress_note.length > 80 ? "…" : ""}"` : "No updates yet";
      const statusEmoji = m.status === "At Risk" ? "⚠️" : m.status === "In Progress" ? "🔵" : "⬜";
      const due = new Date(m.target_date + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
      return `${statusEmoji} ${m.title} — ${m.status} — ${pct}% — Due ${due}\n   Latest: ${note}`;
    });

    await ctx.reply(`🏁 Project milestones:\n\n${lines.join("\n\n")}`);
  });

  // /essentials [term] — browse sections or search entries
  bot.command("essentials", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const term = ctx.match?.trim().toLowerCase();
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("essential_sections")
      .select("id,title,icon,entries:essential_entries!section_id(id,label,data_type,value_text,note)")
      .order("position", { ascending: true });

    if (error) {
      console.error("[/essentials]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const sections = (data as unknown as EssentialSectionRow[]) ?? [];

    if (sections.length === 0) {
      return ctx.reply("No essentials sections found. Ask your PM to set them up.");
    }

    if (!term) {
      // List section titles with entry counts
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const lines = sections.map((s) => {
        const count = (s.entries ?? []).length;
        const icon = s.icon ? `${s.icon} ` : "";
        return `• ${icon}${s.title} (${count} ${count === 1 ? "entry" : "entries"})`;
      });
      await ctx.reply(
        `📚 Essentials sections:\n\n${lines.join("\n")}\n\nView all: ${appUrl}/essentials`
      );
      return;
    }

    // Search mode: match label or value_text
    const matches: Array<{ section: string; icon: string | null; label: string; value: string | null; note: string | null }> = [];
    for (const s of sections) {
      for (const e of s.entries ?? []) {
        const inLabel = e.label.toLowerCase().includes(term);
        const inValue = e.data_type !== "credential" && e.value_text?.toLowerCase().includes(term);
        if (inLabel || inValue) {
          matches.push({ section: s.title, icon: s.icon, label: e.label, value: e.data_type === "credential" ? "••••••" : e.value_text, note: e.note });
        }
      }
    }

    if (matches.length === 0) {
      return ctx.reply(`No essentials entries found for "${term}".`);
    }

    const lines = matches.slice(0, 15).map((m) => {
      const icon = m.icon ? `${m.icon} ` : "";
      const val = m.value ? `\n   Value: ${m.value.slice(0, 100)}${m.value.length > 100 ? "…" : ""}` : "";
      const note = m.note ? `\n   Note: ${m.note}` : "";
      return `• [${icon}${m.section}] ${m.label}${val}${note}`;
    });

    const suffix = matches.length > 15 ? `\n\n…and ${matches.length - 15} more. Check the dashboard for the full list.` : "";
    await ctx.reply(`🔍 Essentials matching "${term}":\n\n${lines.join("\n\n")}${suffix}`);
  });
  // /qa — QA test summary grouped by project
  bot.command("qa", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const supabase = createServiceRoleClient();
    const { data: tests, error } = await supabase
      .from("qa_tests")
      .select("id,title,status,category,bug_report,project:projects!project_id(name),assignee:contributors!assigned_to(full_name,email)")
      .order("status");

    if (error) {
      console.error("[/qa]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const rows = (tests ?? []) as unknown as QATestRow[];

    if (rows.length === 0) {
      return ctx.reply("No QA tests found. Add some on the QA page.");
    }

    // Group by project
    const byProject = new Map<string, { name: string; tests: QATestRow[] }>();
    for (const t of rows) {
      const name = t.project?.name ?? "Unknown Project";
      if (!byProject.has(name)) byProject.set(name, { name, tests: [] });
      byProject.get(name)!.tests.push(t);
    }

    const STATUS_EMOJI: Record<string, string> = {
      Pass: "✅",
      Fail: "❌",
      Blocked: "🚫",
      "Not Run": "⬜",
    };

    const sections: string[] = [];
    for (const { name, tests: projectTests } of Array.from(byProject.values())) {
      const counts = { Pass: 0, Fail: 0, Blocked: 0, "Not Run": 0 };
      for (const t of projectTests) {
        if (t.status in counts) counts[t.status as keyof typeof counts]++;
      }
      const summary = Object.entries(counts)
        .filter(([, n]) => n > 0)
        .map(([s, n]) => `${STATUS_EMOJI[s]} ${s}: ${n}`)
        .join("  ");

      // Show failing/blocked tests explicitly
      const flagged = projectTests.filter((t: QATestRow) => t.status === "Fail" || t.status === "Blocked");
      const flaggedLines = flagged.slice(0, 5).map((t: QATestRow) => {
        const emoji = STATUS_EMOJI[t.status];
        const cat = t.category ? ` [${t.category}]` : "";
        return `  ${emoji} ${t.title}${cat}`;
      });
      const more = flagged.length > 5 ? `\n  …+${flagged.length - 5} more` : "";

      sections.push(
        `📁 ${name} — ${projectTests.length} test${projectTests.length !== 1 ? "s" : ""}\n` +
        summary +
        (flaggedLines.length > 0 ? "\n" + flaggedLines.join("\n") + more : "")
      );
    }

    const total = rows.length;
    const passed = rows.filter((t) => t.status === "Pass").length;
    const failed = rows.filter((t) => t.status === "Fail").length;
    const blocked = rows.filter((t) => t.status === "Blocked").length;
    const header = `🧪 QA Summary — ${total} tests | ✅ ${passed} passed | ❌ ${failed} failed | 🚫 ${blocked} blocked\n\n`;

    const chunks: string[] = [];
    let current = header;
    for (const section of sections) {
      const candidate = current === header ? header + section : current + "\n\n" + section;
      if (candidate.length > 4000) { chunks.push(current); current = section; }
      else current = candidate;
    }
    chunks.push(current);
    for (const chunk of chunks) await ctx.reply(chunk);
  });

  // /bugs — open and in-progress bugs grouped by severity
  bot.command("bugs", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const supabase = createServiceRoleClient();
    const { data: bugs, error } = await supabase
      .from("bugs")
      .select("id,title,severity,status,project:projects!project_id(name),assignee:contributors!assigned_to(full_name,email)")
      .in("status", ["Open", "In Progress"])
      .order("severity")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[/bugs]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const rows = (bugs ?? []) as unknown as BugRow[];

    if (rows.length === 0) {
      return ctx.reply("No open or in-progress bugs right now. 🎉");
    }

    const SEVERITY_EMOJI: Record<string, string> = {
      Critical: "🔴",
      High: "🟠",
      Medium: "🟡",
      Low: "🔵",
    };

    const SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"];
    const bySeverity = new Map<string, BugRow[]>();
    for (const sev of SEVERITY_ORDER) bySeverity.set(sev, []);
    for (const b of rows) {
      if (!bySeverity.has(b.severity)) bySeverity.set(b.severity, []);
      bySeverity.get(b.severity)!.push(b);
    }

    const sections: string[] = [];
    for (const sev of SEVERITY_ORDER) {
      const sevBugs = bySeverity.get(sev) ?? [];
      if (sevBugs.length === 0) continue;
      const lines = sevBugs.slice(0, 8).map((b) => {
        const project = b.project?.name ? ` [${b.project.name}]` : "";
        const assignee = b.assignee?.full_name ?? b.assignee?.email ?? "Unassigned";
        return `  • ${b.title}${project} — ${b.status} — ${assignee}`;
      });
      const more = sevBugs.length > 8 ? `\n  …+${sevBugs.length - 8} more` : "";
      sections.push(`${SEVERITY_EMOJI[sev]} ${sev} (${sevBugs.length})\n${lines.join("\n")}${more}`);
    }

    const header = `🐛 Open Bugs — ${rows.length} total\n\n`;
    const chunks: string[] = [];
    let current = header;
    for (const section of sections) {
      const candidate = current === header ? header + section : current + "\n\n" + section;
      if (candidate.length > 4000) { chunks.push(current); current = section; }
      else current = candidate;
    }
    chunks.push(current);
    for (const chunk of chunks) await ctx.reply(chunk);
  });

  // /team — list all contributors with roles
  bot.command("team", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("contributors")
      .select("id,full_name,email,role:roles!role_id(name,color)")
      .is("deleted_at", null)
      .order("full_name");

    if (error) {
      console.error("[/team]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const members = (data ?? []) as unknown as ContributorRow2[];

    if (members.length === 0) {
      return ctx.reply("No contributors found.");
    }

    // Group by role
    const byRole = new Map<string, ContributorRow2[]>();
    for (const m of members) {
      const role = m.role?.name ?? "No Role";
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role)!.push(m);
    }

    const sections: string[] = [];
    for (const [role, roleMembers] of Array.from(byRole.entries())) {
      const lines = roleMembers.map((m: ContributorRow2) => `  • ${m.full_name ?? m.email}`);
      sections.push(`👥 ${role} (${roleMembers.length})\n${lines.join("\n")}`);
    }

    const header = `🏢 DEVCON+ Team — ${members.length} contributor${members.length !== 1 ? "s" : ""}\n\n`;
    await ctx.reply(header + sections.join("\n\n"));
  });

  // ─── Voice messages ────────────────────────────────────────────────────────
  bot.on("message:voice", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    if (!process.env.GROQ_API_KEY) {
      return ctx.reply(
        "⚠️ Voice commands are not configured yet.\n" +
        "Ask the admin to add GROQ_API_KEY to the server."
      );
    }

    const thinking = await ctx.reply("🎙️ Transcribing…");
    const chatId = ctx.chat.id;
    const msgId = thinking.message_id;

    const editStatus = (text: string) =>
      ctx.api.editMessageText(chatId, msgId, text).catch(() => null);

    try {
      // 1. Download OGG from Telegram
      const fileInfo = await ctx.getFile();
      const token = process.env.TELEGRAM_BOT_TOKEN!;
      const audioRes = await fetch(`https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`);
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

      // 2. Transcribe with Whisper
      const transcript = await transcribeVoice(audioBuffer);
      if (!transcript) {
        await editStatus("❌ Couldn't understand the audio. Please speak clearly and try again.");
        return;
      }

      await editStatus(`🎙️ Heard: "${transcript}"\n\n⏳ Processing…`);

      // 3. Load context for Claude
      const supabase = createServiceRoleClient();
      const [{ data: myTasks }, { data: projectRows }, { data: teamRows }] = await Promise.all([
        supabase.from("tasks").select("title,status").contains("assignee_ids", [contributor.id]).not("status", "eq", "Done").limit(20),
        supabase.from("projects").select("id,name").order("created_at").limit(10),
        supabase.from("contributors").select("id,full_name,email").is("deleted_at", null).limit(30),
      ]);

      // 4. Parse intent
      const intent = await parseVoiceIntent(
        transcript,
        contributor,
        (myTasks ?? []) as Array<{ title: string; status: string }>,
        (projectRows ?? []) as Array<{ name: string }>,
        (teamRows ?? []) as Array<{ full_name: string | null; email: string }>
      );

      // 5. Execute
      if (intent.action === "create_task" && intent.task_title) {
        // Resolve project
        let projectId: string | null = null;
        if (intent.project_name) {
          const { data: p } = await supabase.from("projects").select("id").ilike("name", `%${intent.project_name}%`).limit(1).single();
          projectId = p?.id ?? null;
        }
        if (!projectId && (projectRows ?? []).length > 0) {
          projectId = (projectRows![0] as { id: string }).id;
        }
        if (!projectId) {
          await editStatus(`🎙️ Heard: "${transcript}"\n\n❌ No projects found. Create one on the dashboard first.`);
          return;
        }

        // Resolve group
        let groupId: string | null = null;
        if (intent.group_name) {
          const { data: g } = await supabase.from("groups").select("id").eq("project_id", projectId).ilike("name", `%${intent.group_name}%`).limit(1).single();
          groupId = g?.id ?? null;
        }
        if (!groupId) {
          const { data: g } = await supabase.from("groups").select("id").eq("project_id", projectId).order("position").limit(1).single();
          groupId = g?.id ?? null;
        }
        if (!groupId) {
          await editStatus(`🎙️ Heard: "${transcript}"\n\n❌ No groups found in the project. Add one on the dashboard first.`);
          return;
        }

        // Resolve assignee
        let assigneeId: string | null = null;
        if (intent.assignee_name) {
          const { data: a } = await supabase.from("contributors").select("id").ilike("full_name", `%${intent.assignee_name}%`).is("deleted_at", null).limit(1).single();
          assigneeId = a?.id ?? null;
        }

        const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("group_id", groupId);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("tasks") as any).insert({
          group_id: groupId,
          project_id: projectId,
          title: intent.task_title,
          status: intent.status ?? "Not Started",
          assignee_id: assigneeId,
          assignee_ids: assigneeId ? [assigneeId] : [],
          position: count ?? 0,
        });

        if (error) {
          console.error("[voice:create_task]", error);
          await editStatus(`🎙️ Heard: "${transcript}"\n\n❌ Failed to create the task. Please try again.`);
          return;
        }

        await editStatus(intent.reply ?? `✅ Created task: "${intent.task_title}"`);

      } else if (intent.action === "update_status" && intent.task_keyword && intent.new_status) {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id,title,status")
          .contains("assignee_ids", [contributor.id])
          .ilike("title", `%${intent.task_keyword}%`)
          .limit(5);

        if (!tasks || tasks.length === 0) {
          await editStatus(
            `🎙️ Heard: "${transcript}"\n\n` +
            `❌ No task found matching "${intent.task_keyword}". Try /status to update manually.`
          );
          return;
        }

        if (tasks.length === 1) {
          const task = tasks[0] as unknown as TaskRow;
          await supabase.from("tasks").update({ status: intent.new_status as TaskStatus }).eq("id", task.id);
          await editStatus(intent.reply ?? `✅ Updated "${task.title}" → ${intent.new_status}`);
        } else {
          const keyboard = new InlineKeyboard();
          (tasks as unknown as TaskRow[]).forEach((t) => {
            keyboard.text(t.title.slice(0, 64), `voice_status:${t.id}:${encodeURIComponent(intent.new_status!)}`).row();
          });
          await ctx.api.editMessageText(chatId, msgId,
            `🎙️ Heard: "${transcript}"\n\nFound ${tasks.length} matching tasks. Which one to mark as "${intent.new_status}"?`,
            { reply_markup: keyboard }
          );
        }

      } else {
        await editStatus(
          `🎙️ Heard: "${transcript}"\n\n` +
          (intent.reply ?? `I'm not sure what to do with that. Try:\n• "Create a task called fix the login bug"\n• "Mark the deploy task as done"`)
        );
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[voice command]", err);
      await editStatus(`❌ Voice error: ${msg.slice(0, 200)}`);
    }
  });

  // Callback: voice multi-match status pick
  bot.callbackQuery(/^voice_status:(.+):(.+)$/, async (ctx) => {
    const taskId = ctx.match[1];
    const newStatus = decodeURIComponent(ctx.match[2]) as TaskStatus;
    const supabase = createServiceRoleClient();
    const { data: task, error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId)
      .select("id,title")
      .single();
    await ctx.answerCallbackQuery();
    if (error || !task) return ctx.editMessageText("❌ Failed to update. Please try again.");
    await ctx.editMessageText(`✅ Updated "${(task as unknown as TaskRow).title}" → ${newStatus}`);
  });

  bot.on("message:text", (ctx) => {
    // Only reply to unknown commands in private chats — avoid spamming groups
    const isPrivate = ctx.chat?.type === "private";
    if (isPrivate && ctx.message.text?.startsWith("/")) {
      ctx.reply("Unknown command. Type /help to see what I can do.");
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: TaskStatus[] = [
  "In Progress",
  "Done",
  "Help",
  "I am Stuck",
  "For Improvements",
  "Not Started",
];

function buildStatusKeyboard(taskId: string): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  STATUS_OPTIONS.forEach((s) => {
    keyboard.text(s, `set_status:${taskId}:${encodeURIComponent(s)}`).row();
  });
  return keyboard;
}

const QA_STATUS_OPTIONS = ["Pass", "Fail", "Blocked", "Not Run"] as const;
const QA_STATUS_EMOJI: Record<string, string> = {
  Pass: "✅ Pass", Fail: "❌ Fail", Blocked: "🚫 Blocked", "Not Run": "⬜ Not Run",
};

function buildQAStatusKeyboard(testId: string): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  QA_STATUS_OPTIONS.forEach((s) => {
    keyboard.text(QA_STATUS_EMOJI[s], `set_qa_status:${testId}:${encodeURIComponent(s)}`).row();
  });
  return keyboard;
}

// ─── Legacy helpers kept for any future direct-message usage ──────────────────

export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_GROUP_CHAT_ID not set");
    return;
  }
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function sendTelegramDM(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN not set");
    return;
  }
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
