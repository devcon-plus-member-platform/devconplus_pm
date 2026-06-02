export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase";
import GitClient from "@/components/git/GitClient";
import type { GitHubConnection, GitHubEvent, Project } from "@/types";

export default async function GitPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: projects }, { data: connections }, { data: events }] = await Promise.all([
    supabase.from("projects").select("id,name").order("created_at"),
    supabase
      .from("github_connections" as "projects")
      .select("*, project:projects!project_id(id,name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("github_events" as "projects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  return (
    <GitClient
      initialEvents={(events as unknown as GitHubEvent[]) ?? []}
      initialConnections={(connections as unknown as GitHubConnection[]) ?? []}
      projects={(projects as Project[]) ?? []}
    />
  );
}
