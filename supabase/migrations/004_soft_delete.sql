-- ============================================================
-- DEVCON+ PM — Soft Delete for Contributors
-- Migration: 004_soft_delete.sql
-- ============================================================

-- Add deleted_at to contributors (NULL = active, SET = removed)
ALTER TABLE contributors
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Update is_contributor() to exclude soft-deleted accounts
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
      AND deleted_at IS NULL
  );
$$;

-- Index for efficient active-contributor lookups
CREATE INDEX IF NOT EXISTS idx_contributors_deleted_at
  ON contributors(deleted_at)
  WHERE deleted_at IS NULL;
