// Shared Supabase select string + row mapper for milestones.
// Used by the milestones page (server), the API routes, and the client
// realtime subscription so the shape returned is always consistent.

import type { Milestone } from "@/types";

export const MILESTONE_SELECT = `*,
  progress:milestone_progress(id,milestone_id,logged_by,progress_note,progress_percent,blockers,logged_date,created_at,logger:contributors(id,full_name,email,role_id,telegram_username,deleted_at,created_at)),
  milestone_groups(group:groups(id,project_id,name,position,created_at,tasks(id,status)))`;

export function mapMilestoneRow(raw: Record<string, unknown>): Milestone {
  const { milestone_groups, ...rest } = raw;
  const groups = ((milestone_groups as { group: unknown }[] | null) ?? [])
    .map((mg) => mg.group)
    .filter(Boolean);

  return { ...rest, groups } as unknown as Milestone;
}
