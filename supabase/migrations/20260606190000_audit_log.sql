-- Issue #60: audit log table + auto-trigger for tasks
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,          -- 'task' | 'board' | 'member'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,               -- 'created' | 'updated' | 'deleted' | 'column_changed' | 'assignee_changed' | 'budget_updated' | 'role_changed'
  old_value JSONB,
  new_value JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_board_idx ON public.audit_log(entity_id) WHERE entity_type = 'task';

-- RLS: org admins / board owner can view
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
    OR
    -- Also allow personal workspace owner to view their own audit entries
    performed_by = auth.uid()
  );

-- Allow the trigger function (runs as SECURITY DEFINER) to insert
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── Trigger: log task row changes ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log(entity_type, entity_id, action, new_value, performed_by)
    VALUES ('task', NEW.id, 'created', to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    DECLARE v_action TEXT := 'updated';
    BEGIN
      IF OLD.column_id IS DISTINCT FROM NEW.column_id THEN v_action := 'column_changed'; END IF;
      IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN v_action := 'assignee_changed'; END IF;
      INSERT INTO public.audit_log(entity_type, entity_id, action, old_value, new_value, performed_by)
      VALUES ('task', NEW.id, v_action, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    END;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log(entity_type, entity_id, action, old_value, performed_by)
    VALUES ('task', OLD.id, 'deleted', to_jsonb(OLD), auth.uid());
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_task_audit ON public.tasks;
CREATE TRIGGER trg_task_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_changes();
