import { createServerSupabaseClient } from "@/lib/supabase";
import BugsClient from "@/components/bugs/BugsClient";
import type { Bug, Contributor, Project } from "@/types";

export default async function BugsPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: projects }, { data: contributors }, { data: bugs }] = await Promise.all([
    supabase.from("projects").select("id,name").order("created_at"),
    supabase
      .from("contributors")
      .select("id,email,full_name,role_id,telegram_username,deleted_at,created_at,role:roles(id,name,color,description,created_at)")
      .is("deleted_at", null)
      .order("full_name"),
    supabase
      .from("bugs")
      .select(
        "*, reporter:contributors!reported_by(id,full_name,email,role_id,telegram_username,deleted_at,created_at), assignee:contributors!assigned_to(id,full_name,email,role_id,telegram_username,deleted_at,created_at)"
      )
      .order("created_at", { ascending: false }),
  ]);

  return (
    <BugsClient
      initialBugs={(bugs as Bug[]) ?? []}
      projects={(projects as Project[]) ?? []}
      contributors={(contributors as Contributor[]) ?? []}
    />
  );
}
