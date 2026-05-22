-- ─── Batch 7: Meetings & Reminders ───────────────────────────────────────────

-- meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                uuid REFERENCES projects(id),
  title                     text NOT NULL,
  type                      text CHECK (type IN ('Standup','Audit','Other')) DEFAULT 'Standup',
  description               text,
  meeting_date              date NOT NULL,
  start_time                time NOT NULL,
  end_time                  time NOT NULL,
  timezone                  text DEFAULT 'Asia/Manila',
  recurrence                text CHECK (recurrence IN ('None','Daily','Weekly','Biweekly','Monthly')) DEFAULT 'None',
  recurrence_end_date       date,
  google_calendar_event_id  text,
  google_meet_link          text,
  reminder_minutes_before   integer DEFAULT 30,
  status                    text CHECK (status IN ('Scheduled','Cancelled','Completed')) DEFAULT 'Scheduled',
  created_by                uuid REFERENCES contributors(id),
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

-- meeting_attendees
CREATE TABLE IF NOT EXISTS meeting_attendees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      uuid REFERENCES meetings(id) ON DELETE CASCADE,
  contributor_id  uuid REFERENCES contributors(id),
  rsvp_status     text CHECK (rsvp_status IN ('Pending','Accepted','Declined')) DEFAULT 'Pending',
  UNIQUE (meeting_id, contributor_id)
);

-- meeting_reminders log (deduplication)
CREATE TABLE IF NOT EXISTS meeting_reminders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  uuid REFERENCES meetings(id) ON DELETE CASCADE,
  sent_to     uuid REFERENCES contributors(id),
  sent_at     timestamptz DEFAULT now(),
  channel     text CHECK (channel IN ('Email','Telegram')) DEFAULT 'Email'
);

-- Auto-update trigger on meetings.updated_at
CREATE OR REPLACE FUNCTION update_meeting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_meeting_timestamp();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meetings_project_id    ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date          ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meetings_status        ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_mid  ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_cid  ON meeting_attendees(contributor_id);
CREATE INDEX IF NOT EXISTS idx_meeting_reminders_mid  ON meeting_reminders(meeting_id);

-- RLS
ALTER TABLE meetings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contributors can read meetings"
  ON meetings FOR SELECT USING (is_contributor());

CREATE POLICY "Contributors can insert meetings"
  ON meetings FOR INSERT WITH CHECK (is_contributor());

CREATE POLICY "Contributors can update meetings"
  ON meetings FOR UPDATE USING (is_contributor());

CREATE POLICY "Contributors can delete meetings"
  ON meetings FOR DELETE USING (is_contributor());

CREATE POLICY "Contributors can read meeting_attendees"
  ON meeting_attendees FOR SELECT USING (is_contributor());

CREATE POLICY "Contributors can manage meeting_attendees"
  ON meeting_attendees FOR ALL USING (is_contributor());

CREATE POLICY "Contributors can read meeting_reminders"
  ON meeting_reminders FOR SELECT USING (is_contributor());

CREATE POLICY "Service role can insert meeting_reminders"
  ON meeting_reminders FOR INSERT WITH CHECK (true);
