-- Multi-user task assignment
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assignee_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Allow org members to read each other's profiles (needed for assignee picker)
DROP POLICY IF EXISTS "profiles_org_members_select" ON public.profiles;
CREATE POLICY "profiles_org_members_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = profiles.id
        AND om.status = 'active'
        AND om.org_id IN (
          SELECT org_id FROM public.organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );
