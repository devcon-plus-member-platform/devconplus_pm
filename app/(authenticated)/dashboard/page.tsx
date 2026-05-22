import { createServerSupabaseClient } from "@/lib/supabase";
import DashboardClient from "@/components/board/DashboardClient";
import type { Project, Contributor } from "@/types";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: projects }, { data: contributors }] = await Promise.all([
    supabase
      .from("projects")
      .select("*, creator:contributors(id,full_name,email)")
      .order("created_at"),
    supabase
      .from("contributors")
      .select("*, role:roles(id,name,color)")
      .order("full_name"),
  ]);

  return (
    <DashboardClient
      initialProjects={(projects as Project[]) ?? []}
      contributors={(contributors as Contributor[]) ?? []}
    />
  );
}
