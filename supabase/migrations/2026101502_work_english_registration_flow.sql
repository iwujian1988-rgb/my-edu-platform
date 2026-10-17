-- Follow the platform's admin package -> registration code -> signup grant flow.
BEGIN;

-- Retire the extra client redemption flow. Preserve its history and all learning data.
REVOKE ALL ON FUNCTION public.redeem_work_english_code(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.work_english_has_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u JOIN public.invitation_packages p ON p.id = ANY(u.package_ids)
    WHERE u.id = auth.uid() AND NOT COALESCE(u.is_banned, false)
      AND p.is_active AND 'work_english' = ANY(p.feature_permissions)
      AND (u.permission_expires_at IS NULL OR u.permission_expires_at > now())
  );
$$;

-- Support every admin-created package with this feature, including future tiers.
-- Definer reads package metadata even when a client cannot; session role identifies the caller.
CREATE OR REPLACE FUNCTION public.guard_work_english_profile_grant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_protected_ids uuid[];
BEGIN
  IF current_setting('role', true) IN ('anon', 'authenticated') THEN
    SELECT COALESCE(array_agg(id), '{}'::uuid[]) INTO v_protected_ids
      FROM public.invitation_packages WHERE 'work_english' = ANY(feature_permissions);
    IF TG_OP = 'INSERT' THEN
      IF NEW.package_ids && v_protected_ids THEN RAISE EXCEPTION 'Package grants require a trusted server'; END IF;
    ELSIF (NEW.package_ids && v_protected_ids OR OLD.package_ids && v_protected_ids) AND (
      NEW.package_ids IS DISTINCT FROM OLD.package_ids OR
      NEW.permission_expires_at IS DISTINCT FROM OLD.permission_expires_at OR
      NEW.is_banned IS DISTINCT FROM OLD.is_banned
    ) THEN
      RAISE EXCEPTION 'Package grants require a trusted server';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
NOTIFY pgrst, 'reload schema';
COMMIT;
