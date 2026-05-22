-- ============================================================
-- DEVCON+ PM — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── roles ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  color       text NOT NULL DEFAULT '#6366f1',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed default roles
INSERT INTO roles (name, description, color) VALUES
  ('Project Manager',  'Oversees the full project lifecycle',         '#7c3aed'),
  ('Product Manager',  'Manages product vision and roadmap',          '#6d28d9'),
  ('Fullstack',        'Frontend + backend development',              '#2563eb'),
  ('Frontend',         'UI/UX implementation',                        '#0891b2'),
  ('Backend',          'API and server-side development',             '#059669'),
  ('DevOps',           'Infrastructure, CI/CD, deployment',           '#d97706'),
  ('UI/UX',            'User interface and experience design',        '#db2777'),
  ('QA',               'Quality assurance and testing',               '#dc2626'),
  ('Data Engineer',    'Data pipelines, analytics, and warehousing',  '#7c3aed')
ON CONFLICT DO NOTHING;

-- ─── contributors ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contributors (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text UNIQUE NOT NULL,
  full_name          text,
  role_id            uuid REFERENCES roles(id) ON DELETE SET NULL,
  telegram_username  text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ─── projects ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_by  uuid REFERENCES contributors(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── groups ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── tasks ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  assignee_id     uuid REFERENCES contributors(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'Not Started'
                    CHECK (status IN (
                      'Not Started',
                      'In Progress',
                      'Done',
                      'Help',
                      'I am Stuck',
                      'For Improvements'
                    )),
  timeline_start  date,
  timeline_end    date,
  due_date        date,
  pr_link         text,
  position        integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on tasks
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── task_attachments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name    text NOT NULL,
  file_url     text NOT NULL,
  uploaded_by  uuid REFERENCES contributors(id) ON DELETE SET NULL,
  uploaded_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── announcements ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  body        text NOT NULL,
  created_by  uuid REFERENCES contributors(id) ON DELETE SET NULL,
  sent_at     timestamptz,          -- NULL = draft
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── qa_tests ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qa_tests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  category     text,               -- e.g. Auth, Events, Points, Security, Device
  status       text NOT NULL DEFAULT 'Not Run'
                 CHECK (status IN ('Pass', 'Fail', 'Blocked', 'Not Run')),
  assigned_to  uuid REFERENCES contributors(id) ON DELETE SET NULL,
  bug_report   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER qa_tests_updated_at
  BEFORE UPDATE ON qa_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_group_id       ON tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id     ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id    ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status         ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date       ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_groups_project_id    ON groups(project_id);
CREATE INDEX IF NOT EXISTS idx_qa_tests_project_id  ON qa_tests(project_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_contributors_email   ON contributors(email);
