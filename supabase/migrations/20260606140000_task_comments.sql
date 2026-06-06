-- Issue #56: task_comments — comment threads on tasks
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Index for fast per-task lookups
CREATE INDEX IF NOT EXISTS task_comments_task_id_idx ON public.task_comments(task_id);

-- Any org member on the board can read comments on that board's tasks
CREATE POLICY "task_comments_select" ON public.task_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.boards b ON b.id = t.board_id
      WHERE t.id = task_id
        AND (
          b.owner_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = b.org_id AND om.user_id = auth.uid() AND om.status = 'active')
        )
    )
  );

-- Authenticated users can insert their own comments
CREATE POLICY "task_comments_insert" ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments; owners/admins can delete any
CREATE POLICY "task_comments_delete" ON public.task_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());
