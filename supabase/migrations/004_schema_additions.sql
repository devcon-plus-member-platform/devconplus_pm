-- ============================================================
-- DEVCON+ PM — Schema additions
-- Migration: 004_schema_additions.sql
-- Run in the Supabase SQL Editor
-- ============================================================

-- ─── Add assignee_ids to tasks ────────────────────────────────────────────────
-- Stores multiple assignees per task (array of contributor UUIDs).
-- assignee_id (singular) is kept for backwards compatibility.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assignee_ids text[] NOT NULL DEFAULT '{}';

-- ─── Add deleted_at to contributors (soft-delete support) ────────────────────
ALTER TABLE contributors
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ─── Fix contributors write policy: allow self-registration ──────────────────
-- The original write policy blocks INSERT because is_contributor() returns false
-- for brand-new users (they're not in the table yet — chicken-and-egg).
-- We replace it with three granular policies so new users can create their own row.

DROP POLICY IF EXISTS "contributors_write_contributor" ON contributors;

-- Any authenticated user may insert a row for their own email.
CREATE POLICY "contributors_self_insert"
  ON contributors FOR INSERT
  TO authenticated
  WITH CHECK (email = auth.email());

-- Only existing contributors may update or delete contributor rows.
CREATE POLICY "contributors_update_contributor"
  ON contributors FOR UPDATE
  TO authenticated
  USING (is_contributor())
  WITH CHECK (is_contributor());

CREATE POLICY "contributors_delete_contributor"
  ON contributors FOR DELETE
  TO authenticated
  USING (is_contributor());
