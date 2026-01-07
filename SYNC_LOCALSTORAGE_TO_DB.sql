-- ============================================
-- 查看 localStorage 中哪些单词需要同步
-- ============================================
-- 注意：这个查询只能显示数据库中已有的记录
-- localStorage 中的数据无法通过 SQL 直接查看

-- 查看当前数据库中你的所有单词记录
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
