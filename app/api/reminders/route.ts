import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { sendTaskReminderEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

// Called by Vercel Cron every hour.
// Finds tasks due in 3 days, 1 day, and today (PHT) and emails assignees.
// Deduplicates via task_reminders table — each type is sent at most once per task.

type ReminderType = "3_days" | "1_day" | "due_today";

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const supabase = createServiceRoleClient();

    // Use Asia/Manila time to determine "today"
    const nowPHT = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );
    const today = nowPHT.toISOString().split("T")[0];
    const in1Day = offsetDate(nowPHT, 1);
    const in3Days = offsetDate(nowPHT, 3);

    const targets: { date: string; type: ReminderType }[] = [
      { date: today,   type: "due_today" },
      { date: in1Day,  type: "1_day" },
      { date: in3Days, type: "3_days" },
    ];

    let totalSent = 0;

    for (const { date, type } of targets) {
      // Fetch tasks due on this date that have an assignee and aren't done
      const { data: tasks } = await supabase
        .from("tasks")
        .select(`
          id, title, due_date, status,
          assignee:contributors!assignee_id(id, full_name, email),
          project:projects!project_id(id, name)
        `)
        .eq("due_date", date)
        .not("assignee_id", "is", null)
        .not("status", "in", '("Done")');

      if (!tasks?.length) continue;

      // Fetch already-sent reminders for this type
      const taskIds = tasks.map((t) => t.id);
      const { data: alreadySent } = await supabase
        .from("task_reminders")
        .select("task_id")
        .eq("reminder_type", type)
        .in("task_id", taskIds);

      const sentIds = new Set((alreadySent ?? []).map((r) => r.task_id));

      for (const task of tasks) {
        if (sentIds.has(task.id)) continue;

        const assignee = task.assignee as unknown as { id: string; full_name: string | null; email: string } | null;
        const project = task.project as unknown as { id: string; name: string } | null;
        if (!assignee?.email) continue;

        await sendTaskReminderEmail({
          to: assignee.email,
          assigneeName: assignee.full_name ?? assignee.email,
          taskTitle: task.title,
          projectName: project?.name ?? "Unknown Project",
          dueDate: task.due_date,
          reminderType: type,
        });

        // Record that this reminder was sent
        await supabase.from("task_reminders").insert({
          task_id: task.id,
          reminder_type: type,
        });

        totalSent++;
      }
    }

    return NextResponse.json({ ok: true, sent: totalSent });
  } catch (err) {
    console.error("[reminders]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function offsetDate(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
