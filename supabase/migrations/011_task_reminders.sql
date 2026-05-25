-- ============================================================
-- DEVCON+ PM — Task due-date reminder tracking
-- Migration: 011_task_reminders.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS task_reminders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('3_days', '1_day', 'due_today')),
  sent_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS task_reminders_task_id_idx ON task_reminders(task_id);

ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_reminders_select_authenticated"
  ON task_reminders FOR SELECT TO authenticated USING (true);

CREATE POLICY "task_reminders_select_anon"
  ON task_reminders FOR SELECT TO anon USING (true);
