-- 检查单词 "ability" 的进度数据
SELECT 
  wp.word_id,
  w.word,
  wp.status,
  wp.consecutive_correct_count,
  wp.updated_at
FROM word_progress wp
JOIN words w ON w.id = wp.word_id
WHERE w.word = 'ability'
ORDER BY wp.updated_at DESC
LIMIT 10;
