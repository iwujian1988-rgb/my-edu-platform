-- 查询未掌握的生词（前端显示的）
SELECT 
  COUNT(*) as total_ghost_words,
  COUNT(DISTINCT word) as unique_words
FROM speaker_ghost_words
WHERE user_id = '2ec8712a-5316-423c-9926-0b8fb44fe5d2'
  AND is_mastered = false;

-- 查询所有生词（包括已掌握的）
SELECT 
  COUNT(*) as total_all,
  COUNT(DISTINCT word) as unique_all
FROM speaker_ghost_words
WHERE user_id = '2ec8712a-5316-423c-9926-0b8fb44fe5d2';
