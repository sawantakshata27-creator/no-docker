
-- Helper enum-ish via check; keep flexible
-- Organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active','pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Boards & profiles get org context
ALTER TABLE public.boards ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN current_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  board_id uuid REFERENCES public.boards(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Untitled',
  content jsonb NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE org_id = _org AND user_id = _user AND status = 'active')
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE org_id = _org AND user_id = _user AND status = 'active' AND role IN ('owner','admin'))
$$;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER documents_touch BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Organizations: members can read, owners can update, anyone authenticated can create
CREATE POLICY orgs_member_select ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id, auth.uid()) OR owner_id = auth.uid());
CREATE POLICY orgs_insert ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY orgs_owner_update ON public.organizations FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Lookup by code for join flow: allow authenticated to SELECT minimal info via separate policy
-- We'll allow SELECT on organizations to authenticated users who know the code via a wider policy
-- Simpler: allow all authenticated to select organizations by code (read-only is OK)
CREATE POLICY orgs_public_lookup ON public.organizations FOR SELECT TO authenticated USING (true);
-- (replaces member-only by being permissive — keep both, permissive OR is fine)

-- Organization members
CREATE POLICY om_self_select ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(org_id, auth.uid()) OR public.is_org_admin(org_id, auth.uid()));
CREATE POLICY om_self_request ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY om_admin_update ON public.organization_members FOR UPDATE TO authenticated
  USING (public.is_org_admin(org_id, auth.uid())) WITH CHECK (public.is_org_admin(org_id, auth.uid()));
CREATE POLICY om_admin_delete ON public.organization_members FOR DELETE TO authenticated
  USING (public.is_org_admin(org_id, auth.uid()) OR user_id = auth.uid());

-- Documents: org members can CRUD
CREATE POLICY docs_member_all ON public.documents FOR ALL TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()) AND created_by = auth.uid());

-- Extend boards/columns/tasks RLS to also allow org members (keep owner_id rule)
DROP POLICY IF EXISTS boards_owner_all ON public.boards;
CREATE POLICY boards_access ON public.boards FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid())))
  WITH CHECK (owner_id = auth.uid() OR (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid())));

DROP POLICY IF EXISTS columns_owner_all ON public.board_columns;
CREATE POLICY columns_access ON public.board_columns FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_columns.board_id
    AND (b.owner_id = auth.uid() OR (b.org_id IS NOT NULL AND public.is_org_member(b.org_id, auth.uid())))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_columns.board_id
    AND (b.owner_id = auth.uid() OR (b.org_id IS NOT NULL AND public.is_org_member(b.org_id, auth.uid())))));

DROP POLICY IF EXISTS tasks_owner_all ON public.tasks;
CREATE POLICY tasks_access ON public.tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = tasks.board_id
    AND (b.owner_id = auth.uid() OR (b.org_id IS NOT NULL AND public.is_org_member(b.org_id, auth.uid())))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = tasks.board_id
    AND (b.owner_id = auth.uid() OR (b.org_id IS NOT NULL AND public.is_org_member(b.org_id, auth.uid())))));

-- When an org is created, auto-add owner as active member
CREATE OR REPLACE FUNCTION public.handle_new_org() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.organization_members (org_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active');
  UPDATE public.profiles SET current_org_id = NEW.id WHERE id = NEW.owner_id AND current_org_id IS NULL;
  RETURN NEW;
END $$;

CREATE TRIGGER orgs_after_insert AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_org();

-- Index
CREATE INDEX idx_om_org ON public.organization_members(org_id);
CREATE INDEX idx_om_user ON public.organization_members(user_id);
CREATE INDEX idx_docs_org ON public.documents(org_id);
CREATE INDEX idx_boards_org ON public.boards(org_id);
