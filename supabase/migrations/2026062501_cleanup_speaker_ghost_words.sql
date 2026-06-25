-- Clean existing low-value ghost words and enforce one active card per word/article.

DELETE FROM public.speaker_ghost_words
WHERE is_mastered = FALSE
  AND (
    length(lower(btrim(word))) < 3
    OR lower(btrim(word)) IN (
      'about',
      'after',
      'and',
      'before',
      'been',
      'being',
      'between',
      'but',
      'can',
      'could',
      'did',
      'does',
      'during',
      'for',
      'from',
      'had',
      'has',
      'have',
      'having',
      'her',
      'hers',
      'him',
      'his',
      'how',
      'into',
      'its',
      'may',
      'might',
      'mine',
      'must',
      'not',
      'onto',
      'our',
      'ours',
      'shall',
      'she',
      'should',
      'that',
      'the',
      'their',
      'theirs',
      'them',
      'then',
      'these',
      'they',
      'this',
      'those',
      'through',
      'under',
      'was',
      'were',
      'what',
      'when',
      'where',
      'which',
      'who',
      'whom',
      'whose',
      'why',
      'will',
      'with',
      'would',
      'yeah',
      'yes',
      'you',
      'your',
      'yours'
    )
  );

WITH ranked_words AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, article_id, lower(btrim(word))
      ORDER BY
        CASE error_type WHEN 'wrong' THEN 0 ELSE 1 END,
        created_at ASC,
        id ASC
    ) AS row_number
  FROM public.speaker_ghost_words
  WHERE is_mastered = FALSE
)
DELETE FROM public.speaker_ghost_words AS ghost_words
USING ranked_words
WHERE ghost_words.id = ranked_words.id
  AND ranked_words.row_number > 1;

DROP INDEX IF EXISTS public.idx_speaker_ghost_words_unmastered_unique_article_word;

CREATE UNIQUE INDEX idx_speaker_ghost_words_unmastered_unique_article_word
ON public.speaker_ghost_words (user_id, article_id, lower(btrim(word)))
WHERE is_mastered = FALSE;
