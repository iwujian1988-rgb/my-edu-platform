-- 查询该用户最近的提交记录
SELECT 
  '最近提交' as label,
  total_words,
  correct_count,
  wrong_count,
  skipped_count,
  created_at
FROM speaker_dictation_submissions
WHERE user_id = '2ec8712a-5316-423c-9926-0b8fb44fe5d2'
ORDER BY created_at DESC
LIMIT 5;

-- 查询生词本统计
SELECT 
  '生词本统计' as label,
  COUNT(*) as total_ghost_words,
  COUNT(DISTINCT word) as unique_words
FROM speaker_ghost_words
WHERE user_id = '2ec8712a-5316-423c-9926-0b8fb44fe5d2';
