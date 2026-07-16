export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import ContributorsClient from "@/components/contributors/ContributorsClient";
import type { Contributor, Role, Task, GitHubEvent } from "@/types";

export default async function ContributorsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Only active contributors can manage team members
  const { data: currentContributor } = await supabase
    .from("contributors")
    .select("id")
    .eq("email", user.email!)
    .is("deleted_at", null)
    .single();

  if (!currentContributor) {
    redirect("/dashboard");
  }

  const [{ data: contributors }, { data: deletedContributors }, { data: roles }, { data: tasks }, { data: githubEvents }] = await Promise.all([
    supabase
      .from("contributors")
      .select("*, role:roles(id,name,description,color,created_at)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("contributors")
      .select("*, role:roles(id,name,description,color,created_at)")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("roles")
      .select("*")
      .order("name", { ascending: true }),
    supabase
      .from("tasks")
      .select("id,assignee_id,assignee_ids,status"),
    supabase
      .from("github_events")
      .select("event_type,author_login,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  return (
    <ContributorsClient
      initialContributors={(contributors as Contributor[]) ?? []}
      initialDeletedContributors={(deletedContributors as Contributor[]) ?? []}
      initialRoles={(roles as Role[]) ?? []}
      tasks={(tasks as Pick<Task, "id" | "assignee_id" | "assignee_ids" | "status">[]) ?? []}
      githubEvents={(githubEvents as Pick<GitHubEvent, "event_type" | "author_login" | "created_at">[]) ?? []}
    />
  );
}
