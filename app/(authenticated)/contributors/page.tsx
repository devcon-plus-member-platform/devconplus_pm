export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import { ADMIN_EMAIL } from "@/lib/permissions";
import ContributorsClient from "@/components/contributors/ContributorsClient";
import type { Contributor, Role } from "@/types";

export default async function ContributorsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const [{ data: contributors }, { data: roles }] = await Promise.all([
    supabase
      .from("contributors")
      .select("*, role:roles(id,name,description,color,created_at)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("roles")
      .select("*")
      .order("name", { ascending: true }),
  ]);

  return (
    <ContributorsClient
      initialContributors={(contributors as Contributor[]) ?? []}
      initialRoles={(roles as Role[]) ?? []}
    />
  );
}
