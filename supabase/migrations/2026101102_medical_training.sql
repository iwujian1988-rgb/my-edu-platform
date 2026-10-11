BEGIN;
CREATE TABLE IF NOT EXISTS public.medical_package_features (
  package_id uuid NOT NULL REFERENCES public.invitation_packages(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (feature IN ('history_listening','expression_views','sbar')),
  PRIMARY KEY (package_id, feature)
);
CREATE TABLE IF NOT EXISTS public.medical_video_learning (
  video_id uuid PRIMARY KEY REFERENCES public.videos(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  material jsonb NOT NULL CHECK (jsonb_typeof(material) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.medical_training_progress (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (feature IN ('history_listening','expression_views','sbar')),
  version integer NOT NULL CHECK (version > 0),
  submission jsonb NOT NULL,
  result jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id, feature, version)
);
ALTER TABLE public.medical_package_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_video_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_training_progress ENABLE ROW LEVEL SECURITY;
-- API validates the user's matching package before service-role access. No direct client policy
-- exposes paid materials, answer keys, or other users' submissions.
REVOKE ALL ON public.medical_package_features, public.medical_video_learning, public.medical_training_progress FROM anon, authenticated;
GRANT ALL ON public.medical_package_features, public.medical_video_learning, public.medical_training_progress TO service_role;
CREATE OR REPLACE FUNCTION public.replace_medical_package_features(p_package_id uuid, p_features text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_features IS NULL OR NOT p_features <@ ARRAY['history_listening','expression_views','sbar']::text[] THEN
    RAISE EXCEPTION 'Unsupported medical training features';
  END IF;
  PERFORM id FROM public.invitation_packages WHERE id = p_package_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  DELETE FROM public.medical_package_features WHERE package_id = p_package_id;
  INSERT INTO public.medical_package_features(package_id, feature)
    SELECT p_package_id, feature FROM (SELECT DISTINCT unnest(p_features) AS feature) AS features;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_medical_package_features(uuid,text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_medical_package_features(uuid,text[]) TO service_role;
COMMIT;
