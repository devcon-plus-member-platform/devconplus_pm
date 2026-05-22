import { createServerSupabaseClient } from "@/lib/supabase";
import MeetingsClient from "@/components/meetings/MeetingsClient";
import type { Meeting, Contributor, Project } from "@/types";

export default async function MeetingsPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: projects }, { data: contributors }, { data: meetings }] = await Promise.all([
    supabase.from("projects").select("id,name").order("created_at"),
    supabase
      .from("contributors")
      .select("id,email,full_name,role_id,telegram_username,deleted_at,created_at")
      .is("deleted_at", null)
      .order("full_name"),
    supabase
      .from("meetings")
      .select("*, attendees:meeting_attendees(id,meeting_id,contributor_id,rsvp_status,contributor:contributors(id,full_name,email,role_id,telegram_username,deleted_at,created_at))")
      .order("meeting_date", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  return (
    <MeetingsClient
      initialMeetings={(meetings as Meeting[]) ?? []}
      projects={(projects as Project[]) ?? []}
      contributors={(contributors as Contributor[]) ?? []}
    />
  );
}
