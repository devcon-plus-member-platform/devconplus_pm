import { NextRequest, NextResponse } from "next/server";
import { sendTaskAssignedEmail, sendWelcomeEmail } from "@/lib/resend";
import { createServiceRoleClient } from "@/lib/supabase";
import type { Contributor, Task } from "@/types";

type NotifyPayload =
  | { type: "task_assigned"; task_id: string; assignee_email: string }
  | { type: "welcome_contributor"; email: string; name: string };

export async function POST(request: NextRequest) {
  try {
    const body: NotifyPayload = await request.json();

    // ─── task_assigned ────────────────────────────────────────────────────────
    if (body.type === "task_assigned") {
      const supabase = createServiceRoleClient();

      const { data: task } = await supabase
        .from("tasks")
        .select("*, assignee:contributors(*)")
        .eq("id", body.task_id)
        .single<Task & { assignee: Contributor | null }>();

      if (!task) {
        return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
      }

      await sendTaskAssignedEmail({
        to: body.assignee_email,
        assigneeName: task.assignee?.full_name ?? body.assignee_email,
        taskTitle: task.title,
        status: task.status,
        dueDate: task.due_date,
      });

      return NextResponse.json({ ok: true });
    }

    // ─── welcome_contributor ──────────────────────────────────────────────────
    if (body.type === "welcome_contributor") {
      await sendWelcomeEmail({ to: body.email, name: body.name });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unknown notification type" }, { status: 400 });
  } catch (err) {
    console.error("[notify]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
