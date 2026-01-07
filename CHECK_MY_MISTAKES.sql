-- ============================================
-- 检查特定用户的错题数据
-- 用户 ID: 7078b0aa-d06a-4209-b669-1a0d4985c8ea
-- ============================================

-- 1. 查看你的所有单词状态分布
SELECT
  status,
  COUNT(*) as count
FROM word_progress
WHERE user_id = '7078b0aa-d06a-4209-b669-1a0d4985c8ea'
GROUP BY status
ORDER BY status;

-- 2. 查看你标记为"不认识"、"模糊"、"新"的所有单词
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
  AND wp.status IN ('unknown', 'fuzzy', 'new')
ORDER BY wp.updated_at DESC;

-- 3. 查看你最近操作的单词（最新 10 条，所有状态）
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
ORDER BY wp.updated_at DESC
LIMIT 10;

-- 4. 统计每个词书的单词数量
SELECT
  b.title as book_title,
  wp.status,
  COUNT(*) as count
FROM word_progress wp
LEFT JOIN books b ON b.id = wp.book_id
WHERE wp.user_id = '7078b0aa-d06a-4209-b669-1a0d4985c8ea'
GROUP BY b.title, wp.status
ORDER BY b.title, wp.status;
