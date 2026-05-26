export const dynamic = "force-dynamic";

import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase";
import MyTasksClient from "@/components/board/MyTasksClient";
import type { Task, Project } from "@/types";

export type MyTask = Task & {
  project: Pick<Project, "id" | "name"> | null;
  group: { id: string; name: string } | null;
};

export default async function MyTasksPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <MyTasksClient tasks={[]} contributorName={null} />;
  }

  // Get contributor record for this user
  const db = createServiceRoleClient();
  const { data: contributor } = await db
    .from("contributors")
    .select("id, full_name, email")
    .eq("email", user.email!)
    .is("deleted_at", null)
    .single();

  if (!contributor) {
    // Admin or unrecognised user — no personal tasks
    return <MyTasksClient tasks={[]} contributorName={user.email ?? "Admin"} />;
  }

  const { data: tasks } = await db
    .from("tasks")
    .select(`
      *,
      assignee:contributors!assignee_id(id, full_name, email, role_id, telegram_username, deleted_at, created_at),
      attachments:task_attachments(*),
      project:projects!project_id(id, name),
      group:groups!group_id(id, name)
    `)
    .contains("assignee_ids", [contributor.id])
    .order("due_date", { ascending: true, nullsFirst: false });

  return (
    <MyTasksClient
      tasks={(tasks as MyTask[]) ?? []}
      contributorName={contributor.full_name ?? contributor.email}
    />
  );
}
