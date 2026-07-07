-- ─── milestone_groups ────────────────────────────────────────────────────────
-- Links a milestone to one or more task groups so its progress can be
-- auto-calculated from the status of tasks in those groups.

CREATE TABLE IF NOT EXISTS milestone_groups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  group_id     uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (milestone_id, group_id)
);

CREATE INDEX IF NOT EXISTS milestone_groups_milestone_id_idx ON milestone_groups(milestone_id);
CREATE INDEX IF NOT EXISTS milestone_groups_group_id_idx     ON milestone_groups(group_id);

ALTER TABLE milestone_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milestone_groups_select" ON milestone_groups
  FOR SELECT USING (is_contributor());

CREATE POLICY "milestone_groups_insert" ON milestone_groups
  FOR INSERT WITH CHECK (is_contributor());

CREATE POLICY "milestone_groups_delete" ON milestone_groups
  FOR DELETE USING (is_contributor());

-- Service role bypass (for Edge Functions and API routes using service role)
CREATE POLICY "milestone_groups_service_role" ON milestone_groups
  FOR ALL USING (auth.role() = 'service_role');
