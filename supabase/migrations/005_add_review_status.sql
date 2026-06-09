-- ============================================================
-- DEVCON+ PM — Add "Review" task status
-- Migration: 005_add_review_status.sql
-- Run in the Supabase SQL Editor
-- ============================================================

-- PostgreSQL auto-names an inline CHECK constraint "<table>_<column>_check".
-- Drop it and re-create it with "Review" included.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check CHECK (status IN (
    'Not Started',
    'In Progress',
    'Review',
    'Done',
    'Help',
    'I am Stuck',
    'For Improvements'
  ));
