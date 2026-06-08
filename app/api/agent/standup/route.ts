import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createServiceRoleClient } from "@/lib/supabase";
import { sendTelegramMessage } from "@/lib/telegram";

function verifyCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// Vercel Cron calls GET
export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runStandup();
}

// Manual trigger from the dashboard
export async function POST() {
  return runStandup();
}

async function runStandup() {
  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().split("T")[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

  const [
    { data: projects },
    { data: rawTasks },
    { data: rawMilestones },
    { data: rawBugs },
  ] = await Promise.all([
    supabase.from("projects").select("id,name").order("created_at"),
    supabase
      .from("tasks")
      .select("id,title,status,due_date,project_id,updated_at,assignee:contributors!assignee_id(full_name,email)")
      .order("updated_at", { ascending: false }),
    supabase
      .from("milestones")
      .select("id,title,status,target_date,project_id,progress:milestone_progress!milestone_id(progress_percent,logged_date)")
      .not("status", "in", '("Achieved","Missed")')
      .order("target_date", { ascending: true }),
    supabase
      .from("bugs")
      .select("id,severity,status,project_id")
      .in("status", ["Open", "In Progress"]),
  ]);

  type TaskRow = {
    id: string; title: string; status: string; due_date: string | null;
    project_id: string; updated_at: string;
    assignee: { full_name: string | null; email: string } | null;
  };
  type MilestoneRow = {
    id: string; title: string; status: string; target_date: string; project_id: string | null;
    progress: Array<{ progress_percent: number; logged_date: string }>;
  };
  type BugRow = { id: string; severity: string; status: string; project_id: string };

  const tasks = (rawTasks ?? []) as unknown as TaskRow[];
  const milestones = (rawMilestones ?? []) as unknown as MilestoneRow[];
  const bugs = (rawBugs ?? []) as unknown as BugRow[];

  const overdueTasks = tasks.filter(t =>
    t.due_date && t.due_date < today && t.status !== "Done"
  );
  const blockedTasks = tasks.filter(t =>
    (t.status === "Help" || t.status === "I am Stuck") &&
    new Date(t.updated_at) <= twoDaysAgo
  );
  const openTasks = tasks.filter(t => t.status !== "Done");
  const doneTasks = tasks.filter(t => t.status === "Done");

  const milestoneSummaries = milestones.map(m => {
    const sorted = [...(m.progress ?? [])].sort((a, b) => b.logged_date.localeCompare(a.logged_date));
    const pct = sorted[0]?.progress_percent ?? 0;
    const daysLeft = Math.ceil((new Date(m.target_date).getTime() - Date.now()) / 86400000);
    return { title: m.title, status: m.status, progress_pct: pct, days_remaining: daysLeft };
  });

  const projectSummaries = (projects ?? []).map(p => {
    const pt = tasks.filter(t => t.project_id === p.id);
    return {
      name: p.name,
      open: pt.filter(t => t.status !== "Done").length,
      done: pt.filter(t => t.status === "Done").length,
      overdue: pt.filter(t => t.due_date && t.due_date < today && t.status !== "Done").length,
      blocked: pt.filter(t => t.status === "Help" || t.status === "I am Stuck").length,
    };
  });

  const context = {
    date: new Date().toLocaleDateString("en-PH", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }),
    totals: {
      open_tasks: openTasks.length,
      done_tasks: doneTasks.length,
      overdue: overdueTasks.length,
      blocked: blockedTasks.length,
    },
    projects: projectSummaries,
    overdue_tasks: overdueTasks.slice(0, 8).map(t => ({
      title: t.title,
      days_overdue: Math.ceil((Date.now() - new Date(t.due_date!).getTime()) / 86400000),
      assignee: t.assignee?.full_name ?? t.assignee?.email ?? "Unassigned",
    })),
    blocked_tasks: blockedTasks.slice(0, 8).map(t => ({
      title: t.title,
      status: t.status,
      assignee: t.assignee?.full_name ?? t.assignee?.email ?? "Unassigned",
    })),
    milestones: milestoneSummaries,
    bugs: {
      critical: bugs.filter(b => b.severity === "Critical").length,
      high: bugs.filter(b => b.severity === "High").length,
      total_open: bugs.length,
    },
    high_severity_overdue: overdueTasks.filter(t => t.due_date && t.due_date < threeDaysAgo).length,
  };

  let digestBody = "";

  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const resp = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 600,
        temperature: 0.4,
        messages: [{
          role: "user",
          content:
            `You are a project management assistant generating a daily standup digest for a software team.\n` +
            `Write in plain text only — no markdown, no asterisks, no bullet symbols, no special characters.\n` +
            `Structure: start with a one-line overview, then cover blockers (if any), overdue tasks (if any), ` +
            `milestone health, and bug status. End with a short motivational line.\n` +
            `Be concise, direct, and practical. Max 320 words.\n\n` +
            `Data:\n${JSON.stringify(context, null, 2)}\n\n` +
            `Write the standup digest now:`,
        }],
      });
      digestBody = resp.choices[0]?.message?.content?.trim() ?? "";
    } catch (err) {
      console.error("[standup] Groq error:", err);
    }
  }

  // Fallback: rule-based digest if Groq unavailable or errored
  if (!digestBody) {
    const lines: string[] = [
      `Daily Standup — ${context.date}`,
      ``,
      `Team: ${context.totals.open_tasks} open tasks | ${context.totals.done_tasks} completed | ${context.totals.overdue} overdue | ${context.totals.blocked} blocked`,
    ];
    if (context.totals.blocked > 0) {
      lines.push(`\nBLOCKED:`);
      blockedTasks.slice(0, 5).forEach(t => {
        lines.push(`  ${t.title} (${t.status}) — ${t.assignee?.full_name ?? t.assignee?.email ?? "Unassigned"}`);
      });
    }
    if (context.totals.overdue > 0) {
      lines.push(`\nOVERDUE:`);
      overdueTasks.slice(0, 5).forEach(t => {
        lines.push(`  ${t.title} — ${t.assignee?.full_name ?? t.assignee?.email ?? "Unassigned"}`);
      });
    }
    if (milestoneSummaries.length > 0) {
      lines.push(`\nMILESTONES:`);
      milestoneSummaries.slice(0, 4).forEach(m => {
        lines.push(`  ${m.title} — ${m.progress_pct}% — ${m.days_remaining}d remaining`);
      });
    }
    if (context.bugs.total_open > 0) {
      lines.push(`\nBUGS: ${context.bugs.critical} critical, ${context.bugs.high} high, ${context.bugs.total_open} total open`);
    }
    digestBody = lines.join("\n");
  }

  // Save to announcements
  await supabase.from("announcements").insert({
    title: `Daily Standup — ${today}`,
    body: digestBody,
  });

  // Broadcast to Telegram group
  const telegramText = `📋 Daily Standup — ${today}\n\n${digestBody}`;
  let telegramError: string | undefined;
  try {
    await sendTelegramMessage(telegramText.slice(0, 4096));
  } catch (err) {
    telegramError = err instanceof Error ? err.message : String(err);
    console.error("[standup] Telegram send error:", err);
  }

  return NextResponse.json({ ok: true, date: today, length: digestBody.length, ...(telegramError && { telegram_error: telegramError }) });
}
