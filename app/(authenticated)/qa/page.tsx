import { createServerSupabaseClient } from "@/lib/supabase";
import QAClient from "@/components/qa/QAClient";
import type { Project, Contributor } from "@/types";

export default async function QAPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: projects }, { data: contributors }] = await Promise.all([
    supabase.from("projects").select("id,name,description,created_by,created_at").order("created_at"),
    supabase
      .from("contributors")
      .select("*, role:roles(id,name,color)")
      .is("deleted_at", null)
      .order("full_name"),
  ]);

  return (
    <QAClient
      initialProjects={(projects as Project[]) ?? []}
      contributors={(contributors as Contributor[]) ?? []}
    />
  );
}
