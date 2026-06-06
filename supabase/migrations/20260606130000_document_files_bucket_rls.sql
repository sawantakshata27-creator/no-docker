-- Issue #49: create document-files storage bucket (if not exists)
-- and open RLS to all active org members (not just board owners).

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'document-files',
  'document-files',
  false,
  52428800  -- 50 MB per file
)
ON CONFLICT (id) DO NOTHING;

-- Drop any old owner-only policies that may have been created manually
DROP POLICY IF EXISTS "doc_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "doc_files_select" ON storage.objects;
DROP POLICY IF EXISTS "doc_files_delete" ON storage.objects;
DROP POLICY IF EXISTS "doc_files_update" ON storage.objects;

-- All active org members can upload
CREATE POLICY "doc_files_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'document-files' AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id::text = (storage.foldername(name))[1]
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- All active org members can view/download
CREATE POLICY "doc_files_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'document-files' AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id::text = (storage.foldername(name))[1]
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- All active org members can delete
CREATE POLICY "doc_files_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'document-files' AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id::text = (storage.foldername(name))[1]
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );
