-- ============================================================
-- DEVCON+ PM — Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- ============================================================

-- ─── Helper: is the current Supabase Auth user a contributor? ─────────────────
CREATE OR REPLACE FUNCTION is_contributor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM contributors
    WHERE email = auth.email()
  );
$$;

-- ─── Enable RLS on all tables ─────────────────────────────────────────────────
ALTER TABLE roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_tests           ENABLE ROW LEVEL SECURITY;

-- ─── roles ────────────────────────────────────────────────────────────────────
CREATE POLICY "roles_select_authenticated"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "roles_write_contributor"
  ON roles FOR ALL
  TO authenticated
  USING (is_contributor())
  WITH CHECK (is_contributor());

-- ─── contributors ─────────────────────────────────────────────────────────────
CREATE POLICY "contributors_select_authenticated"
  ON contributors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "contributors_write_contributor"
  ON contributors FOR ALL
  TO authenticated
  USING (is_contributor())
  WITH CHECK (is_contributor());

-- ─── projects ─────────────────────────────────────────────────────────────────
CREATE POLICY "projects_select_authenticated"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "projects_write_contributor"
  ON projects FOR ALL
  TO authenticated
  USING (is_contributor())
  WITH CHECK (is_contributor());

-- ─── groups ───────────────────────────────────────────────────────────────────
CREATE POLICY "groups_select_authenticated"
  ON groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "groups_write_contributor"
  ON groups FOR ALL
  TO authenticated
  USING (is_contributor())
  WITH CHECK (is_contributor());

-- ─── tasks ────────────────────────────────────────────────────────────────────
CREATE POLICY "tasks_select_authenticated"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tasks_write_contributor"
  ON tasks FOR ALL
  TO authenticated
  USING (is_contributor())
  WITH CHECK (is_contributor());

-- ─── task_attachments ─────────────────────────────────────────────────────────
CREATE POLICY "task_attachments_select_authenticated"
  ON task_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "task_attachments_write_contributor"
  ON task_attachments FOR ALL
  TO authenticated
  USING (is_contributor())
  WITH CHECK (is_contributor());

-- ─── announcements ────────────────────────────────────────────────────────────
CREATE POLICY "announcements_select_authenticated"
  ON announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "announcements_write_contributor"
  ON announcements FOR ALL
  TO authenticated
  USING (is_contributor())
  WITH CHECK (is_contributor());

-- ─── qa_tests ─────────────────────────────────────────────────────────────────
CREATE POLICY "qa_tests_select_authenticated"
  ON qa_tests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "qa_tests_write_contributor"
  ON qa_tests FOR ALL
  TO authenticated
  USING (is_contributor())
  WITH CHECK (is_contributor());
