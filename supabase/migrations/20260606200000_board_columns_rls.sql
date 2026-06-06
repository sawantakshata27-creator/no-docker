-- Fix #77: Ensure board_columns has proper RLS for INSERT/UPDATE/DELETE
-- The SELECT policies already exist from earlier migrations. This adds the
-- write-side policies so org owners/admins can manage columns.

-- DROP old conflicting policies first (safe if they don't exist)
DROP POLICY IF EXISTS "board_columns_insert" ON public.board_columns;
DROP POLICY IF EXISTS "board_columns_update" ON public.board_columns;
DROP POLICY IF EXISTS "board_columns_delete" ON public.board_columns;

-- INSERT: org owner or admin may add columns to their boards
CREATE POLICY "board_columns_insert" ON public.board_columns FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_id AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.org_id = b.org_id AND om.user_id = auth.uid()
            AND om.status = 'active' AND om.role IN ('owner', 'admin')
        )
      )
    )
  );

-- UPDATE: same gate as INSERT
CREATE POLICY "board_columns_update" ON public.board_columns FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_id AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.org_id = b.org_id AND om.user_id = auth.uid()
            AND om.status = 'active' AND om.role IN ('owner', 'admin')
        )
      )
    )
  );

-- DELETE: same gate
CREATE POLICY "board_columns_delete" ON public.board_columns FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_id AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.org_id = b.org_id AND om.user_id = auth.uid()
            AND om.status = 'active' AND om.role IN ('owner', 'admin')
        )
      )
    )
  );

-- Also allow any authenticated user to UPDATE boards delivery date
-- (the existing SELECT/UPDATE policies may be too restrictive on boards)
DROP POLICY IF EXISTS "boards_update_delivery" ON public.boards;
CREATE POLICY "boards_update_delivery" ON public.boards FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = org_id AND om.user_id = auth.uid()
        AND om.status = 'active' AND om.role IN ('owner', 'admin')
    )
  );
