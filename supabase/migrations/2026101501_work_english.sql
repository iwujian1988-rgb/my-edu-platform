-- Independent product; shared platform accounts, invitation packages and codes.
BEGIN;

INSERT INTO public.invitation_packages (id, name, description, validity_days, feature_permissions, book_permissions, language_packages, is_active, sort_order)
VALUES ('741aee1a-1fd4-49c4-bf69-44900d18b301', '名企职场英语', '跟着谷歌、微软学职场英语。独立套餐；当前验收内容为第001期。', 365, ARRAY['work_english'], ARRAY[]::text[], ARRAY['en'], true, 80)
ON CONFLICT (id) DO NOTHING;

-- Existing profile RLS permits self-updates. A client must never grant itself
-- this paid package or extend its expiry by updating its own profile.
CREATE OR REPLACE FUNCTION public.guard_work_english_profile_grant()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_package uuid := '741aee1a-1fd4-49c4-bf69-44900d18b301';
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF v_package = ANY(NEW.package_ids) THEN RAISE EXCEPTION 'Package grants require a trusted server'; END IF;
    ELSIF (v_package = ANY(NEW.package_ids) OR v_package = ANY(OLD.package_ids)) AND (
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
DROP TRIGGER IF EXISTS work_english_profile_grant_guard ON public.users;
CREATE TRIGGER work_english_profile_grant_guard BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_work_english_profile_grant();

CREATE OR REPLACE FUNCTION public.work_english_has_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u JOIN public.invitation_packages p
      ON p.id = '741aee1a-1fd4-49c4-bf69-44900d18b301'::uuid
    WHERE u.id = auth.uid() AND NOT COALESCE(u.is_banned, false)
      AND p.is_active AND p.id = ANY(u.package_ids)
      AND (u.permission_expires_at IS NULL OR u.permission_expires_at > now())
  );
$$;
REVOKE ALL ON FUNCTION public.work_english_has_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.work_english_has_access() TO authenticated;

CREATE TABLE IF NOT EXISTS public.work_english_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL CHECK (lesson_id ~ '^[0-9]{3,6}$'),
  lesson_version integer NOT NULL CHECK (lesson_version > 0),
  state jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(state) = 'object' AND octet_length(state::text) <= 32768),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, lesson_id, lesson_version)
);
ALTER TABLE public.work_english_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.work_english_progress TO authenticated;
REVOKE ALL ON public.work_english_progress FROM anon;
GRANT ALL ON public.work_english_progress TO service_role;
DROP POLICY IF EXISTS work_english_read_own ON public.work_english_progress;
CREATE POLICY work_english_read_own ON public.work_english_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.work_english_has_access());
DROP POLICY IF EXISTS work_english_insert_own ON public.work_english_progress;
CREATE POLICY work_english_insert_own ON public.work_english_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.work_english_has_access());
DROP POLICY IF EXISTS work_english_update_own ON public.work_english_progress;
CREATE POLICY work_english_update_own ON public.work_english_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.work_english_has_access())
  WITH CHECK (user_id = auth.uid() AND public.work_english_has_access());

CREATE TABLE IF NOT EXISTS public.work_english_activation_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0
);
ALTER TABLE public.work_english_activation_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.work_english_activation_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.redeem_work_english_code(p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_code public.invitation_codes%ROWTYPE;
  v_package public.invitation_packages%ROWTYPE;
  v_attempts integer;
  v_expiry timestamptz;
BEGIN
  IF auth.uid() IS NULL OR length(p_code) > 80 THEN RETURN false; END IF;
  SELECT * INTO v_user FROM public.users WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_user.is_banned, false) THEN RETURN false; END IF;

  INSERT INTO public.work_english_activation_limits(user_id, attempts) VALUES (auth.uid(), 1)
  ON CONFLICT (user_id) DO UPDATE SET
    attempts = CASE WHEN work_english_activation_limits.window_start < now() - interval '1 hour' THEN 1 ELSE work_english_activation_limits.attempts + 1 END,
    window_start = CASE WHEN work_english_activation_limits.window_start < now() - interval '1 hour' THEN now() ELSE work_english_activation_limits.window_start END
  RETURNING attempts INTO v_attempts;
  IF v_attempts > 8 THEN RETURN false; END IF;

  SELECT * INTO v_code FROM public.invitation_codes
    WHERE code = upper(trim(p_code)) AND is_active
      AND package_id = '741aee1a-1fd4-49c4-bf69-44900d18b301'::uuid
      AND used_by IS NULL AND COALESCE(used_count, 0) < max_uses
      AND (expires_at IS NULL OR expires_at > now()) FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO v_package FROM public.invitation_packages WHERE id = v_code.package_id AND is_active;
  IF NOT FOUND THEN RETURN false; END IF;
  v_expiry := CASE WHEN v_package.validity_days IS NULL THEN NULL ELSE now() + make_interval(days => v_package.validity_days) END;

  -- The shared platform has one expiry field. Never shorten an existing grant or
  -- overwrite features/books when an existing video/book customer adds this product.
  UPDATE public.users SET
    package_ids = ARRAY(SELECT DISTINCT unnest(COALESCE(v_user.package_ids, '{}'::uuid[]) || ARRAY[v_package.id])),
    feature_permissions = ARRAY(SELECT DISTINCT unnest(COALESCE(v_user.feature_permissions, '{}'::text[]) || ARRAY['work_english'])),
    permission_expires_at = CASE
      WHEN v_expiry IS NULL OR (cardinality(v_user.package_ids) > 0 AND v_user.permission_expires_at IS NULL) THEN NULL
      ELSE greatest(v_user.permission_expires_at, v_expiry) END
    WHERE id = auth.uid();
  UPDATE public.invitation_codes SET used_by = auth.uid(), used_at = now(), used_count = COALESCE(used_count,0) + 1 WHERE id = v_code.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_work_english_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_work_english_code(text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
