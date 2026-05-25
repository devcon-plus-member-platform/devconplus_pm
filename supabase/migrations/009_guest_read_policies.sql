-- ============================================================
-- DEVCON+ PM — Guest (anon) read-only access
-- Migration: 009_guest_read_policies.sql
--
-- Allows anyone with the URL to view the board without signing in.
-- All write operations (INSERT/UPDATE/DELETE) still require a
-- verified contributor session — guests are strictly read-only.
-- ============================================================

-- ─── roles ────────────────────────────────────────────────────────────────────
CREATE POLICY "roles_select_anon"
  ON roles FOR SELECT
  TO anon
  USING (true);

-- ─── contributors ─────────────────────────────────────────────────────────────
CREATE POLICY "contributors_select_anon"
  ON contributors FOR SELECT
  TO anon
  USING (deleted_at IS NULL);

-- ─── projects ─────────────────────────────────────────────────────────────────
CREATE POLICY "projects_select_anon"
  ON projects FOR SELECT
  TO anon
  USING (true);

-- ─── groups ───────────────────────────────────────────────────────────────────
CREATE POLICY "groups_select_anon"
  ON groups FOR SELECT
  TO anon
  USING (true);

-- ─── tasks ────────────────────────────────────────────────────────────────────
CREATE POLICY "tasks_select_anon"
  ON tasks FOR SELECT
  TO anon
  USING (true);

-- ─── task_attachments ─────────────────────────────────────────────────────────
CREATE POLICY "task_attachments_select_anon"
  ON task_attachments FOR SELECT
  TO anon
  USING (true);

-- ─── announcements ────────────────────────────────────────────────────────────
CREATE POLICY "announcements_select_anon"
  ON announcements FOR SELECT
  TO anon
  USING (true);

-- ─── qa_tests ─────────────────────────────────────────────────────────────────
CREATE POLICY "qa_tests_select_anon"
  ON qa_tests FOR SELECT
  TO anon
  USING (true);

-- ─── bugs ─────────────────────────────────────────────────────────────────────
CREATE POLICY "bugs_select_anon"
  ON bugs FOR SELECT
  TO anon
  USING (true);

-- ─── meetings ─────────────────────────────────────────────────────────────────
CREATE POLICY "meetings_select_anon"
  ON meetings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "meeting_attendees_select_anon"
  ON meeting_attendees FOR SELECT
  TO anon
  USING (true);

-- ─── milestones ───────────────────────────────────────────────────────────────
CREATE POLICY "milestones_select_anon"
  ON milestones FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "milestone_progress_select_anon"
  ON milestone_progress FOR SELECT
  TO anon
  USING (true);

-- ─── essentials ───────────────────────────────────────────────────────────────
CREATE POLICY "essential_sections_select_anon"
  ON essential_sections FOR SELECT
  TO anon
  USING (true);

-- Guests can read non-sensitive entries only
CREATE POLICY "essential_entries_select_anon"
  ON essential_entries FOR SELECT
  TO anon
  USING (is_sensitive = false);
