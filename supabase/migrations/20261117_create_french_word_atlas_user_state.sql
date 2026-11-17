CREATE TABLE IF NOT EXISTS public.french_word_atlas_user_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.french_word_atlas_user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS french_word_atlas_state_select_own ON public.french_word_atlas_user_state;
CREATE POLICY french_word_atlas_state_select_own
  ON public.french_word_atlas_user_state
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS french_word_atlas_state_insert_own ON public.french_word_atlas_user_state;
CREATE POLICY french_word_atlas_state_insert_own
  ON public.french_word_atlas_user_state
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS french_word_atlas_state_update_own ON public.french_word_atlas_user_state;
CREATE POLICY french_word_atlas_state_update_own
  ON public.french_word_atlas_user_state
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.french_word_atlas_user_state TO authenticated;

COMMENT ON TABLE public.french_word_atlas_user_state IS 'Per-user French Word Atlas learning progress and settings';
