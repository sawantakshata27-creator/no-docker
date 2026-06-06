-- Issue #53: add 'stakeholder' to the app_role enum
-- Stakeholders have read-only access to boards and dashboards.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'stakeholder';

-- Update tasks RLS: stakeholders (org members) can SELECT but not INSERT/UPDATE/DELETE
-- The existing tasks_owner_all policy allows the board owner full access.
-- We add a read policy for all active org members (including stakeholders).
CREATE POLICY "tasks_org_member_select" ON public.tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_id AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.org_id = b.org_id AND om.user_id = auth.uid() AND om.status = 'active'
        )
      )
    )
  );

-- Same for board_columns
CREATE POLICY "columns_org_member_select" ON public.board_columns FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_id AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.org_id = b.org_id AND om.user_id = auth.uid() AND om.status = 'active'
        )
      )
    )
  );
