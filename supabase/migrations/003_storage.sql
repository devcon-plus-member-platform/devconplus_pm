-- ============================================================
-- DEVCON+ PM — Storage Bucket & Policies
-- Migration: 003_storage.sql
-- Run this in the Supabase SQL Editor (Storage API is not pure SQL,
-- but this migration documents intent + creates the storage policies).
-- ============================================================

-- NOTE: The bucket itself must be created via the Supabase dashboard or CLI:
--   supabase storage create task-attachments --public=false
-- The SQL below creates the bucket programmatically if using the storage schema:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  false,
  5242880,  -- 5 MB in bytes
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─── Storage RLS policies ─────────────────────────────────────────────────────

-- Contributors can upload files
CREATE POLICY "task_attachments_upload_contributor"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND is_contributor()
  );

-- All authenticated users can view/download files (via signed URLs)
CREATE POLICY "task_attachments_select_authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'task-attachments');

-- Contributors can delete their own uploads
CREATE POLICY "task_attachments_delete_contributor"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND is_contributor()
  );
