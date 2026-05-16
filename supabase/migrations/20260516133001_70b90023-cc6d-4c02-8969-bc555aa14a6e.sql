ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS docs_member_all ON public.documents;
CREATE POLICY docs_members_read ON public.documents
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY docs_members_insert ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id, auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY docs_members_update ON public.documents
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY docs_delete_owner_or_admin ON public.documents
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_org_admin(org_id, auth.uid())
  );

CREATE POLICY doc_versions_members_read ON public.document_versions
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY doc_versions_members_insert ON public.document_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id, auth.uid())
    AND created_by = auth.uid()
  );

CREATE INDEX IF NOT EXISTS idx_document_versions_document_created
  ON public.document_versions(document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_versions_org
  ON public.document_versions(org_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('document-files', 'document-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_access_document_storage(object_name text, _user uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  org_folder text;
BEGIN
  org_folder := (storage.foldername(object_name))[1];
  IF org_folder IS NULL THEN
    RETURN false;
  END IF;

  RETURN public.is_org_member(org_folder::uuid, _user);
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

DROP POLICY IF EXISTS "Workspace members can view document files" ON storage.objects;
CREATE POLICY "Workspace members can view document files"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'document-files'
  AND public.can_access_document_storage(name, auth.uid())
);

DROP POLICY IF EXISTS "Workspace members can upload document files" ON storage.objects;
CREATE POLICY "Workspace members can upload document files"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'document-files'
  AND public.can_access_document_storage(name, auth.uid())
);

DROP POLICY IF EXISTS "Workspace members can update document files" ON storage.objects;
CREATE POLICY "Workspace members can update document files"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'document-files'
  AND public.can_access_document_storage(name, auth.uid())
)
WITH CHECK (
  bucket_id = 'document-files'
  AND public.can_access_document_storage(name, auth.uid())
);

DROP POLICY IF EXISTS "Workspace members can delete document files" ON storage.objects;
CREATE POLICY "Workspace members can delete document files"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'document-files'
  AND public.can_access_document_storage(name, auth.uid())
);