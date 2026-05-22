import { Bot, InlineKeyboard } from "grammy";
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

// ─── Bot singleton ────────────────────────────────────────────────────────────

let _bot: Bot | null = null;

export function getBot(): Bot {
  if (!_bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
    _bot = new Bot(token);
    registerHandlers(_bot);
  }
  return _bot;
}

// ─── Contributor lookup ───────────────────────────────────────────────────────

async function getContributor(telegramUsername: string): Promise<ContributorRow | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("contributors")
    .select("id,email,full_name,role_id,deleted_at,role:roles(name)")
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
        "/mytasks — View your currently assigned tasks\n" +
        "/deadlines — Tasks due in the next 7 days\n" +
        "/status <keyword> — Search your tasks and update status\n" +
        "/announce <message> — \\(PM only\\) Send announcement to all contributors\n" +
        "/help — Show this message",
      { parse_mode: "MarkdownV2" }
    );
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
      .select("id,title,status,due_date,project:projects(name),group:groups(name)")
      .eq("assignee_id", contributor.id)
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
      .select("id,title,status,due_date,project:projects(name)")
      .eq("assignee_id", contributor.id)
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
      .eq("assignee_id", contributor.id)
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

  // Fallback for unknown commands
  bot.on("message:text", (ctx) => {
    if (ctx.message.text?.startsWith("/")) {
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
