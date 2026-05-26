-- Add multi-assignee support to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_ids uuid[] NOT NULL DEFAULT '{}';

-- Seed from existing single assignee_id
UPDATE tasks SET assignee_ids = ARRAY[assignee_id] WHERE assignee_id IS NOT NULL;
