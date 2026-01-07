-- 查询 1: 查看你的所有 word_progress 记录
SELECT
  w.word,
  wp.status,
  wp.created_at,
  wp.updated_at,
  b.title as book_title
FROM word_progress wp
JOIN words w ON w.id = wp.word_id
LEFT JOIN books b ON b.id = wp.book_id
WHERE wp.user_id = '7078b0aa-d06a-4209-b669-1a0d4985c8ea'
ORDER BY wp.updated_at DESC;
