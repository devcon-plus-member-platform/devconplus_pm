-- Project status: Active/Inactive, editable from the dashboard.
-- Bot commands (lib/telegram.ts, buildStandup.ts) filter to Active projects only.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Inactive'));
