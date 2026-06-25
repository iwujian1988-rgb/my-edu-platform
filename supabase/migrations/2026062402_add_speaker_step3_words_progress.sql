-- Add the required Step 3 "understand words" progress marker.
ALTER TABLE public.speaker_progress
ADD COLUMN IF NOT EXISTS step3_words_completed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.speaker_progress.step3_words_completed
IS 'Speaker Step 3: all ghost words for this article have been understood/mastered.';

-- Backfill existing records that already have no unmastered ghost words.
UPDATE public.speaker_progress sp
SET
  step3_words_completed = TRUE,
  updated_at = NOW()
WHERE sp.step2_completed = TRUE
  AND sp.step3_words_completed = FALSE
  AND NOT EXISTS (
    SELECT 1
    FROM public.speaker_ghost_words gw
    WHERE gw.user_id = sp.user_id
      AND gw.article_id = sp.article_id
      AND COALESCE(gw.is_mastered, FALSE) = FALSE
  );
