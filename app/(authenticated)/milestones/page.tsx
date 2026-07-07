export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase";
import MilestonesClient from "@/components/milestones/MilestonesClient";
import { MILESTONE_SELECT, mapMilestoneRow } from "@/lib/milestones";
import type { Contributor, Project, Group } from "@/types";

export default async function MilestonesPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: projects }, { data: groups }, { data: contributors }, { data: milestones }] = await Promise.all([
    supabase.from("projects").select("id,name,status,description,created_by,created_at").order("created_at"),
    // Only groups belonging to Active projects can be linked to a milestone.
    supabase
      .from("groups")
      .select("id,project_id,name,position,created_at,projects!inner(status)")
      .eq("projects.status", "Active")
      .order("position"),
    supabase
      .from("contributors")
      .select("id,email,full_name,role_id,telegram_username,deleted_at,created_at")
      .is("deleted_at", null)
      .order("full_name"),
    supabase.from("milestones").select(MILESTONE_SELECT).order("target_date", { ascending: true }),
  ]);

  return (
    <MilestonesClient
      initialMilestones={((milestones as Record<string, unknown>[]) ?? []).map(mapMilestoneRow)}
      projects={(projects as Project[]) ?? []}
      activeGroups={(groups as unknown as Group[]) ?? []}
      contributors={(contributors as unknown as Contributor[]) ?? []}
    />
  );
}
