import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { sendTelegramMessage } from "@/lib/telegram";

function verifyCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runEscalation();
}

export async function POST() {
  return runEscalation();
}

async function runEscalation() {
  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().split("T")[0];
  // Only escalate tasks that have been stagnant (no update) for 2+ days
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

  const { data: rawTasks } = await supabase
    .from("tasks")
    .select("id,title,due_date,status,updated_at,project_id,assignee:contributors!assignee_id(id,full_name,email,telegram_username)")
    .lt("due_date", today)
    .not("status", "eq", "Done")
    .not("status", "eq", "Help")
    .not("status", "eq", "I am Stuck")
    .not("assignee_id", "is", null)
    .order("due_date", { ascending: true });

  type AssigneeRow = { id: string; full_name: string | null; email: string; telegram_username: string | null };
  type TaskRow = {
    id: string; title: string; due_date: string; status: string;
    updated_at: string; project_id: string;
    assignee: AssigneeRow | null;
  };

  const tasks = (rawTasks ?? []) as unknown as TaskRow[];

  // Filter: stagnant only (not updated in 2+ days — actively worked tasks are excluded)
  const stagnant = tasks.filter(t => new Date(t.updated_at) <= twoDaysAgo);

  if (stagnant.length === 0) {
    return NextResponse.json({ ok: true, escalated: 0, message: "No stagnant overdue tasks found." });
  }

  // Group by assignee
  const byAssignee = new Map<string, { assignee: AssigneeRow; tasks: TaskRow[] }>();
  for (const t of stagnant) {
    if (!t.assignee) continue;
    const key = t.assignee.id;
    if (!byAssignee.has(key)) byAssignee.set(key, { assignee: t.assignee, tasks: [] });
    byAssignee.get(key)!.tasks.push(t);
  }

  if (byAssignee.size === 0) {
    return NextResponse.json({ ok: true, escalated: 0, message: "No assigned overdue tasks." });
  }

  // Build the group message
  const dateLabel = new Date().toLocaleDateString("en-PH", {
    weekday: "short", month: "short", day: "numeric",
  });

  const sections: string[] = [];

  for (const { assignee, tasks: atasks } of Array.from(byAssignee.values())) {
    const mention = assignee.telegram_username ? `@${assignee.telegram_username}` : (assignee.full_name ?? assignee.email);
    const taskLines = atasks.slice(0, 5).map(t => {
      const daysOverdue = Math.ceil((Date.now() - new Date(t.due_date).getTime()) / 86400000);
      return `  • "${t.title}" — ${daysOverdue}d overdue`;
    });
    const extra = atasks.length > 5 ? `\n  …+${atasks.length - 5} more` : "";
    sections.push(`${mention} (${atasks.length} task${atasks.length > 1 ? "s" : ""}):\n${taskLines.join("\n")}${extra}`);
  }

  const totalOverdue = Array.from(byAssignee.values()).reduce((sum, { tasks: t }) => sum + t.length, 0);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const message = [
    `⏰ Overdue Escalation — ${dateLabel}`,
    ``,
    `${totalOverdue} stagnant overdue task${totalOverdue > 1 ? "s" : ""} need attention:`,
    ``,
    sections.join("\n\n"),
    ``,
    `Please update the task status or due date on the dashboard.${appUrl ? `\n${appUrl}/dashboard` : ""}`,
  ].join("\n");

  let telegramError: string | undefined;
  try {
    await sendTelegramMessage(message.slice(0, 4096));
  } catch (err) {
    telegramError = err instanceof Error ? err.message : String(err);
    console.error("[overdue-escalation] Telegram send error:", err);
  }

  return NextResponse.json({
    ok: true,
    escalated: totalOverdue,
    contributors: byAssignee.size,
    ...(telegramError && { telegram_error: telegramError }),
  });
}
