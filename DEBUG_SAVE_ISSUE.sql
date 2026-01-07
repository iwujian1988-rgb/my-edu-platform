-- ============================================
-- 调试：检查为什么"不认识"的单词没有保存
-- ============================================

-- 1. 查看你的所有 word_progress 记录（所有状态）
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
LIMIT 20;

-- 2. 检查是否有使用旧状态值 'vague' 的记录
SELECT
  w.word,
  wp.status,
  wp.created_at,
  wp.updated_at
FROM word_progress wp
JOIN words w ON w.id = wp.word_id
WHERE wp.user_id = '7078b0aa-d06a-4209-b669-1a0d4985c8ea'
  AND wp.status = 'vague';

-- 3. 查看数据库约束是否正确
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS check_clause
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'word_progress'
  AND con.contype = 'C';

-- 4. 统计你的总记录数
SELECT COUNT(*) as total_count FROM word_progress
WHERE user_id = '7078b0aa-d06a-4209-b669-1a0d4985c8ea';
