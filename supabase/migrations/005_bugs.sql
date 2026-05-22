-- ─── Batch 6: Bug Reporting ──────────────────────────────────────────────────

-- bugs table
CREATE TABLE IF NOT EXISTS bugs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid REFERENCES projects(id) ON DELETE CASCADE,
  title               text NOT NULL,
  description         text NOT NULL,
  steps_to_reproduce  text,
  expected_behavior   text,
  actual_behavior     text,
  severity            text CHECK (severity IN ('Critical','High','Medium','Low')) DEFAULT 'Medium',
  status              text CHECK (status IN ('Open','In Progress','Resolved','Closed','Cannot Reproduce')) DEFAULT 'Open',
  reported_by         uuid REFERENCES contributors(id),
  assigned_to         uuid REFERENCES contributors(id),
  qa_test_id          uuid REFERENCES qa_tests(id),
  task_id             uuid REFERENCES tasks(id),
  pr_link             text,
  environment         text,
  browser_device      text,
  screenshot_urls     text[] DEFAULT '{}',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- bug_activity audit trail
CREATE TABLE IF NOT EXISTS bug_activity (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id        uuid REFERENCES bugs(id) ON DELETE CASCADE,
  changed_by    uuid REFERENCES contributors(id),
  field_changed text NOT NULL,
  old_value     text,
  new_value     text,
  changed_at    timestamptz DEFAULT now()
);

-- Link qa_tests → bugs (set when test is escalated)
ALTER TABLE qa_tests ADD COLUMN IF NOT EXISTS bug_id uuid REFERENCES bugs(id);

-- Auto-update trigger on bugs.updated_at
CREATE OR REPLACE FUNCTION update_bug_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bugs_updated_at
  BEFORE UPDATE ON bugs
  FOR EACH ROW EXECUTE FUNCTION update_bug_timestamp();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bugs_project_id    ON bugs(project_id);
CREATE INDEX IF NOT EXISTS idx_bugs_status        ON bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_assigned_to   ON bugs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_bugs_qa_test_id    ON bugs(qa_test_id);
CREATE INDEX IF NOT EXISTS idx_bug_activity_bug   ON bug_activity(bug_id);

-- RLS
ALTER TABLE bugs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contributors can read bugs"
  ON bugs FOR SELECT USING (is_contributor());

CREATE POLICY "Contributors can insert bugs"
  ON bugs FOR INSERT WITH CHECK (is_contributor());

CREATE POLICY "Contributors can update bugs"
  ON bugs FOR UPDATE USING (is_contributor());

CREATE POLICY "Contributors can delete bugs"
  ON bugs FOR DELETE USING (is_contributor());

CREATE POLICY "Contributors can read bug_activity"
  ON bug_activity FOR SELECT USING (is_contributor());

CREATE POLICY "Contributors can insert bug_activity"
  ON bug_activity FOR INSERT WITH CHECK (is_contributor());

-- Storage bucket: bug-screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bug-screenshots',
  'bug-screenshots',
  false,
  5242880,
  ARRAY['image/png','image/jpeg','image/gif','image/webp','video/mp4']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Contributors can upload bug screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bug-screenshots' AND is_contributor());

CREATE POLICY "Contributors can read bug screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bug-screenshots' AND is_contributor());

CREATE POLICY "Contributors can delete bug screenshots"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'bug-screenshots' AND is_contributor());
