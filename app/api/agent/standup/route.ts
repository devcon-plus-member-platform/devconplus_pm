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
  return runStandup();
}

export async function POST() {
  return runStandup();
}

const STATUS_GROUPS: { label: string; statuses: string[] }[] = [
  { label: "Done", statuses: ["Done"] },
  { label: "For Improvements", statuses: ["For Improvements"] },
  { label: "Ongoing", statuses: ["In Progress"] },
  { label: "Review", statuses: ["Review"] },
  { label: "Stuck", statuses: ["Help", "I am Stuck"] },
  { label: "Not Started", statuses: ["Not Started"] },
];

async function runStandup() {
  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: projects },
    { data: rawTasks },
    { data: rawMilestones },
    { data: rawBugs },
    { data: rawRisks },
  ] = await Promise.all([
    supabase.from("projects").select("id,name").order("created_at"),
    supabase
      .from("tasks")
      .select("id,title,status,due_date,project_id,assignee:contributors!assignee_id(full_name,email)")
      .order("updated_at", { ascending: false }),
    supabase
      .from("milestones")
      .select("id,title,project_id,progress:milestone_progress!milestone_id(progress_percent,logged_date)")
      .not("status", "in", '("Achieved","Missed")')
      .order("target_date", { ascending: true }),
    supabase
      .from("bugs")
      .select("id,title,severity,status")
      .in("status", ["Open", "In Progress"])
      .order("created_at", { ascending: false }),
    supabase
      .from("risks")
      .select("id,title,category,probability,impact,status")
      .in("status", ["Open", "Mitigating"])
      .order("created_at", { ascending: false }),
  ]);

  type TaskRow = {
    id: string; title: string; status: string; due_date: string | null; project_id: string;
    assignee: { full_name: string | null; email: string } | null;
  };
  type MilestoneRow = {
    id: string; title: string; project_id: string | null;
    progress: Array<{ progress_percent: number; logged_date: string }>;
  };
  type BugRow = { id: string; title: string; severity: string; status: string };
  type RiskRow = { id: string; title: string; category: string; probability: string; impact: string; status: string };

  const tasks = (rawTasks ?? []) as unknown as TaskRow[];
  const milestones = (rawMilestones ?? []) as unknown as MilestoneRow[];
  const bugs = (rawBugs ?? []) as unknown as BugRow[];
  const risks = (rawRisks ?? []) as unknown as RiskRow[];
  const projectList = projects ?? [];

  // Overall completion rate based on milestone progress
  const progresses = milestones.map(m => {
    const sorted = [...(m.progress ?? [])].sort((a, b) => b.logged_date.localeCompare(a.logged_date));
    return sorted[0]?.progress_percent ?? 0;
  });
  const avgProgress = progresses.length > 0
    ? progresses.reduce((a, b) => a + b, 0) / progresses.length
    : 0;

  const dateStr = new Date().toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const batchLabel = projectList.map(p => p.name).join("/");
  const lines: string[] = [];

  const fmtTask = (t: TaskRow) => {
    const assignee = t.assignee?.full_name ?? t.assignee?.email ?? "Unassigned";
    const deadline = t.due_date
      ? new Date(t.due_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
      : "No deadline";
    return `• ${t.title} — ${assignee} | ${deadline}`;
  };

  // ── Header ──────────────────────────────────────────────────────────────────
  lines.push(`Daily Standup for DEVCON+`);
  lines.push(`Date: ${dateStr}`);
  lines.push(``);

  // ── 1. Executive Summary ────────────────────────────────────────────────────
  lines.push(`1. Executive Summary`);
  lines.push(``);
  lines.push(`${batchLabel} is currently at ${avgProgress.toFixed(2)}% overall completion across ${tasks.length} tracked tasks.`);
  lines.push(``);

  // ── Status of Backlogs ──────────────────────────────────────────────────────
  lines.push(`Status of Backlogs`);

  for (const project of projectList) {
    const pt = tasks.filter(t => t.project_id === project.id);
    lines.push(``);
    lines.push(project.name);

    for (const group of STATUS_GROUPS) {
      const groupTasks = pt.filter(t => group.statuses.includes(t.status));
      lines.push(``);
      lines.push(`${group.label} (${groupTasks.length})`);
      groupTasks.forEach(t => lines.push(fmtTask(t)));
    }
  }

  lines.push(``);

  // ── 2. Security Analysis Summary ────────────────────────────────────────────
  lines.push(`2. Security Analysis Summary`);
  lines.push(``);
  lines.push(`Key Findings:`);
  lines.push(``);
  if (risks.length > 0) {
    risks.slice(0, 10).forEach(r => {
      const cleanTitle = r.title.replace(/^⚡ Auto: /, "");
      lines.push(`• [${r.category}] ${cleanTitle} — Probability: ${r.probability}, Impact: ${r.impact}`);
    });
  } else {
    lines.push(`• No active risks detected.`);
  }

  lines.push(``);

  // ── 3. Critical Updates ─────────────────────────────────────────────────────
  lines.push(`3. Critical Updates`);
  lines.push(``);
  const stuckTasks = tasks.filter(t => t.status === "Help" || t.status === "I am Stuck");
  if (stuckTasks.length > 0) {
    stuckTasks.slice(0, 10).forEach(t => lines.push(fmtTask(t)));
  } else {
    lines.push(`• No blockers at this time.`);
  }

  lines.push(``);

  // ── 4. Bugs ─────────────────────────────────────────────────────────────────
  lines.push(`4. Bugs`);
  lines.push(``);
  if (bugs.length > 0) {
    bugs.slice(0, 15).forEach(b => lines.push(`• [${b.severity}] ${b.title}`));
  } else {
    lines.push(`• No open bugs.`);
  }

  const digestBody = lines.join("\n");

  // Save to announcements
  await supabase.from("announcements").insert({
    title: `Daily Standup — ${today}`,
    body: digestBody,
  });

  // Broadcast to Telegram
  let telegramError: string | undefined;
  try {
    await sendTelegramMessage(digestBody.slice(0, 4096));
  } catch (err) {
    telegramError = err instanceof Error ? err.message : String(err);
    console.error("[standup] Telegram send error:", err);
  }

  return NextResponse.json({ ok: true, date: today, length: digestBody.length, ...(telegramError && { telegram_error: telegramError }) });
}
