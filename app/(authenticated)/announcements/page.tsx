import { createServerSupabaseClient } from "@/lib/supabase";
import AnnouncementsClient from "@/components/announcements/AnnouncementsClient";
import type { Announcement, Contributor } from "@/types";

export default async function AnnouncementsPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: announcements }, { data: me }] = await Promise.all([
    supabase
      .from("announcements")
      .select("*, author:contributors(id,full_name,email)")
      .order("created_at", { ascending: false }),
    supabase
      .from("contributors")
      .select("id,email,full_name")
      .is("deleted_at", null),
  ]);

  return (
    <AnnouncementsClient
      initialAnnouncements={(announcements as Announcement[]) ?? []}
      contributors={(me as Contributor[]) ?? []}
    />
  );
}
