import { createServiceRoleClient } from "@/lib/supabase";

const STATUS_GROUPS: { label: string; statuses: string[] }[] = [
  { label: "Done", statuses: ["Done"] },
  { label: "For Improvements", statuses: ["For Improvements"] },
  { label: "Ongoing", statuses: ["In Progress"] },
  { label: "Review", statuses: ["Review"] },
  { label: "Stuck", statuses: ["Help", "I am Stuck"] },
  { label: "Not Started", statuses: ["Not Started"] },
];

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

function fmtTask(t: TaskRow): string {
  const assignee = t.assignee?.full_name ?? t.assignee?.email ?? "Unassigned";
  const deadline = t.due_date
    ? new Date(t.due_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
    : "No deadline";
  return `• ${t.title} — ${assignee} | ${deadline}`;
}

export async function buildDailyStandup(): Promise<string> {
  const supabase = createServiceRoleClient();

  const [
    { data: projects },
    { data: rawTasks },
    { data: rawMilestones },
    { data: rawBugs },
    { data: rawRisks },
  ] = await Promise.all([
    supabase.from("projects").select("id,name").eq("status", "Active").order("created_at"),
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

  const tasks = (rawTasks ?? []) as unknown as TaskRow[];
  const milestones = (rawMilestones ?? []) as unknown as MilestoneRow[];
  const bugs = (rawBugs ?? []) as unknown as BugRow[];
  const risks = (rawRisks ?? []) as unknown as RiskRow[];
  const projectList = (projects ?? []) as Array<{ id: string; name: string }>;

  const milestoneProgress = milestones
    .filter(m => !m.project_id || projectList.some(p => p.id === m.project_id))
    .map(m => {
      const sorted = [...(m.progress ?? [])].sort((a, b) => b.logged_date.localeCompare(a.logged_date));
      const pct = sorted[0]?.progress_percent ?? 0;
      const projectName = projectList.find(p => p.id === m.project_id)?.name ?? "Unknown";
      return { title: m.title, pct, projectName };
    });

  const dateStr = new Date().toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const batchLabel = projectList.map(p => p.name).join("/");
  const lines: string[] = [];

  lines.push(`Daily Standup for DEVCON+`);
  lines.push(`Date: ${dateStr}`);
  lines.push(``);

  lines.push(`1. Executive Summary`);
  lines.push(``);
  lines.push(`${batchLabel} — Milestone Completion Rates:`);
  lines.push(``);
  if (milestoneProgress.length > 0) {
    milestoneProgress.forEach(m => {
      lines.push(`• [${m.projectName}] ${m.title}: ${m.pct.toFixed(2)}%`);
    });
  } else {
    lines.push(`• No active milestones.`);
  }
  lines.push(``);

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

  lines.push(`3. Critical Updates`);
  lines.push(``);
  const stuckTasks = tasks.filter(t => t.status === "Help" || t.status === "I am Stuck");
  if (stuckTasks.length > 0) {
    stuckTasks.slice(0, 10).forEach(t => lines.push(fmtTask(t)));
  } else {
    lines.push(`• No blockers at this time.`);
  }

  lines.push(``);

  lines.push(`4. Bugs`);
  lines.push(``);
  if (bugs.length > 0) {
    bugs.slice(0, 15).forEach(b => lines.push(`• [${b.severity}] ${b.title}`));
  } else {
    lines.push(`• No open bugs.`);
  }

  return lines.join("\n");
}
