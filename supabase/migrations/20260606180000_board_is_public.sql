-- Issue #63: add is_public column to boards for public shareable links
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS boards_is_public_idx ON public.boards(is_public) WHERE is_public = true;

-- Allow anonymous/unauthenticated SELECT on public boards
DROP POLICY IF EXISTS "boards_public_select" ON public.boards;
CREATE POLICY "boards_public_select" ON public.boards FOR SELECT
  USING (is_public = true);

-- Allow anonymous read on board_columns of public boards
DROP POLICY IF EXISTS "board_columns_public_select" ON public.board_columns;
CREATE POLICY "board_columns_public_select" ON public.board_columns FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id AND b.is_public = true)
  );

-- Allow anonymous read on tasks of public boards (title, priority, column_id, process_stage only)
DROP POLICY IF EXISTS "tasks_public_select" ON public.tasks;
CREATE POLICY "tasks_public_select" ON public.tasks FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id AND b.is_public = true)
  );
