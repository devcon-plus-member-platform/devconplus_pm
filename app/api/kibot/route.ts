import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createServiceRoleClient } from "@/lib/supabase";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages ?? [];

    if (!messages.length) {
      return NextResponse.json({ ok: false, error: "No messages provided." }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const today = new Date().toISOString().split("T")[0];
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

    const [
      { data: projects },
      { data: rawTasks },
      { data: rawMilestones },
      { data: rawBugs },
      { data: rawRisks },
      { data: rawAnnouncements },
      { data: rawContributors },
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
        .select("id,title,severity,status,project_id")
        .in("status", ["Open", "In Progress"])
        .order("created_at", { ascending: false }),
      supabase
        .from("risks")
        .select("id,title,category,probability,impact,status,project_id")
        .in("status", ["Open", "Mitigating"])
        .order("created_at", { ascending: false }),
      supabase
        .from("announcements")
        .select("id,title,body,created_at")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("contributors")
        .select("id,full_name,email,role:roles(name)")
        .is("deleted_at", null)
        .order("full_name"),
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
    type BugRow = { id: string; title: string; severity: string; status: string; project_id: string };
    type RiskRow = { id: string; title: string; category: string; probability: string; impact: string; status: string; project_id: string };
    type AnnouncementRow = { id: string; title: string; body: string; created_at: string };
    type ContributorRow = { id: string; full_name: string | null; email: string; role: { name: string } | null };

    const tasks = (rawTasks ?? []) as unknown as TaskRow[];
    const milestones = (rawMilestones ?? []) as unknown as MilestoneRow[];
    const bugs = (rawBugs ?? []) as unknown as BugRow[];
    const risks = (rawRisks ?? []) as unknown as RiskRow[];
    const announcements = (rawAnnouncements ?? []) as unknown as AnnouncementRow[];
    const contributors = (rawContributors ?? []) as unknown as ContributorRow[];
    const projectList = (projects ?? []) as Array<{ id: string; name: string }>;

    const projectMap = new Map(projectList.map((p) => [p.id, p.name]));

    const overdueTasks = tasks.filter(
      (t) => t.due_date && t.due_date < today && t.status !== "Done"
    );
    const blockedTasks = tasks.filter(
      (t) =>
        (t.status === "Help" || t.status === "I am Stuck") &&
        new Date(t.updated_at) <= twoDaysAgo
    );

    // Build compact context string
    const lines: string[] = [];

    lines.push(`Today: ${new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`);
    lines.push("");

    // Projects
    lines.push("PROJECTS:");
    if (projectList.length === 0) {
      lines.push("  (none)");
    } else {
      for (const p of projectList) {
        const pt = tasks.filter((t) => t.project_id === p.id);
        const open = pt.filter((t) => t.status !== "Done").length;
        const done = pt.filter((t) => t.status === "Done").length;
        const overdue = pt.filter((t) => t.due_date && t.due_date < today && t.status !== "Done").length;
        const blocked = pt.filter((t) => t.status === "Help" || t.status === "I am Stuck").length;
        lines.push(`  - ${p.name}: ${open} open, ${done} done, ${overdue} overdue, ${blocked} blocked`);
      }
    }
    lines.push("");

    // Overdue tasks
    if (overdueTasks.length > 0) {
      lines.push(`OVERDUE TASKS (${overdueTasks.length} total, showing up to 10):`);
      for (const t of overdueTasks.slice(0, 10)) {
        const daysOverdue = Math.ceil((Date.now() - new Date(t.due_date!).getTime()) / 86400000);
        const assignee = t.assignee?.full_name ?? t.assignee?.email ?? "Unassigned";
        const project = projectMap.get(t.project_id) ?? "Unknown project";
        lines.push(`  - "${t.title}" [${project}] — ${daysOverdue}d overdue — ${assignee}`);
      }
      lines.push("");
    }

    // Blocked tasks
    if (blockedTasks.length > 0) {
      lines.push(`BLOCKED/STUCK TASKS (${blockedTasks.length} total):`);
      for (const t of blockedTasks.slice(0, 10)) {
        const assignee = t.assignee?.full_name ?? t.assignee?.email ?? "Unassigned";
        const project = projectMap.get(t.project_id) ?? "Unknown project";
        lines.push(`  - "${t.title}" [${project}] — ${t.status} — ${assignee}`);
      }
      lines.push("");
    }

    // Milestones
    if (milestones.length > 0) {
      lines.push("ACTIVE MILESTONES:");
      for (const m of milestones) {
        const sorted = [...(m.progress ?? [])].sort((a, b) => b.logged_date.localeCompare(a.logged_date));
        const pct = sorted[0]?.progress_percent ?? 0;
        const daysLeft = Math.ceil((new Date(m.target_date).getTime() - Date.now()) / 86400000);
        const project = m.project_id ? (projectMap.get(m.project_id) ?? "Unknown") : "No project";
        const daysStr = daysLeft > 0 ? `${daysLeft}d remaining` : `${Math.abs(daysLeft)}d overdue`;
        lines.push(`  - "${m.title}" [${project}] — ${m.status} — ${pct}% — ${daysStr} (target: ${m.target_date})`);
      }
      lines.push("");
    }

    // Bugs
    const criticalBugs = bugs.filter((b) => b.severity === "Critical");
    const highBugs = bugs.filter((b) => b.severity === "High");
    if (bugs.length > 0) {
      lines.push(`OPEN BUGS: ${bugs.length} total (${criticalBugs.length} critical, ${highBugs.length} high)`);
      for (const b of [...criticalBugs, ...highBugs].slice(0, 8)) {
        const project = projectMap.get(b.project_id) ?? "Unknown";
        lines.push(`  - [${b.severity}] "${b.title}" [${project}] — ${b.status}`);
      }
      if (bugs.length > criticalBugs.length + highBugs.length) {
        const others = bugs.length - criticalBugs.length - highBugs.length;
        lines.push(`  + ${others} medium/low severity bugs`);
      }
      lines.push("");
    }

    // Risks
    if (risks.length > 0) {
      lines.push(`OPEN RISKS (${risks.length} total):`);
      for (const r of risks.slice(0, 8)) {
        const project = projectMap.get(r.project_id) ?? "Unknown";
        lines.push(`  - "${r.title}" [${project}] — ${r.category} — ${r.probability} prob / ${r.impact} impact — ${r.status}`);
      }
      lines.push("");
    }

    // Contributors
    if (contributors.length > 0) {
      lines.push("CONTRIBUTORS:");
      for (const c of contributors) {
        const role = (c.role as { name: string } | null)?.name ?? "No role";
        lines.push(`  - ${c.full_name ?? c.email} (${role})`);
      }
      lines.push("");
    }

    // Announcements
    if (announcements.length > 0) {
      lines.push("RECENT ANNOUNCEMENTS:");
      for (const a of announcements) {
        const excerpt = a.body?.slice(0, 120).replace(/\n/g, " ") ?? "";
        lines.push(`  - "${a.title}" (${a.created_at.slice(0, 10)}): ${excerpt}${a.body?.length > 120 ? "…" : ""}`);
      }
    }

    const contextBlock = lines.join("\n");

    const systemPrompt =
      `You are Kibot, the friendly AI project management assistant for DEVCON+ Philippines.\n` +
      `You help contributors and project managers stay on top of their work by answering questions about tasks, milestones, bugs, risks, and team status.\n` +
      `You have real-time access to the DEVCON+ PM dashboard data shown below.\n\n` +
      `Guidelines:\n` +
      `- Be friendly, concise, and practical. You can be a bit warm and conversational — this is a tight-knit team.\n` +
      `- Use plain text. Avoid markdown unless a list genuinely helps clarity.\n` +
      `- When referencing tasks or milestones, use their exact titles.\n` +
      `- If asked about something not in your data, say so honestly.\n` +
      `- For PM advice, be direct and action-oriented.\n` +
      `- Keep responses under 200 words unless a detailed breakdown is explicitly asked for.\n\n` +
      `--- CURRENT PROJECT DATA ---\n${contextBlock}`;

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({
        ok: false,
        error: "Kibot is not configured yet. Ask your admin to set the GROQ_API_KEY environment variable.",
      }, { status: 503 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const resp = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 512,
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const message = resp.choices[0]?.message?.content?.trim() ?? "Sorry, I didn't get a response. Please try again.";
    return NextResponse.json({ ok: true, message });
  } catch (err) {
    console.error("[POST /api/kibot]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
