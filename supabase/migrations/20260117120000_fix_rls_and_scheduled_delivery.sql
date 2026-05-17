-- =====================================================================
-- 1) Fix "new row violates row-level security policy" on document upload
-- ---------------------------------------------------------------------
-- The previous can_access_document_storage() only allowed users who have
-- an ACTIVE row in public.organization_members. If an org owner's
-- membership row is somehow missing or still pending (edge cases during
-- org creation / invitation flows), the storage INSERT policy fails with
-- a 42501 / "row-level security policy" error.
--
-- We rewrite the helper so it ALSO allows the organization owner as a
-- safe fallback. Behaviour for non-owners is unchanged.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.can_access_document_storage(object_name text, _user uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  org_folder text;
  org_uuid uuid;
BEGIN
  IF _user IS NULL THEN
    RETURN false;
  END IF;

  org_folder := (storage.foldername(object_name))[1];
  IF org_folder IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    org_uuid := org_folder::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  -- Primary check: active org member
  IF public.is_org_member(org_uuid, _user) THEN
    RETURN true;
  END IF;

  -- Fallback: org owner (covers edge cases where the membership row is
  -- missing or still 'pending' so they can still upload to their own org).
  IF EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = org_uuid AND owner_id = _user
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_document_storage(text, uuid)
  TO authenticated, anon;

-- =====================================================================
-- 2) Editable scheduled delivery date for projects (boards)
-- ---------------------------------------------------------------------
-- Boards represent projects in this app. We add an editable
-- scheduled_delivery_date column so teams can adjust timelines directly
-- from the board page. RLS for boards already permits org members to
-- update the row, so no extra policies are required.
-- =====================================================================
ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS scheduled_delivery_date DATE;

COMMENT ON COLUMN public.boards.scheduled_delivery_date IS
  'Planned/scheduled delivery date for the project. Editable inline by org owners and admins.';
