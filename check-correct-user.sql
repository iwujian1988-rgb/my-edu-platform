-- 查询该用户的生词本统计
SELECT 
  COUNT(*) as total_ghost_words,
  COUNT(DISTINCT word) as unique_words
FROM speaker_ghost_words
WHERE user_id = '7078b0aa-d06a-4209-b669-1a0d4985c8ea'
  AND is_mastered = false;

-- 查询该用户最近的提交记录
SELECT 
  total_words,
  correct_count,
  wrong_count,
  skipped_count,
  created_at
FROM speaker_dictation_submissions
WHERE user_id = '7078b0aa-d06a-4209-b669-1a0d4985c8ea'
ORDER BY created_at DESC
LIMIT 3;
