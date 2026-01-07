-- ============================================
-- 错题本问题诊断和修复脚本
-- 请在 Supabase SQL Editor 中按顺序执行
-- ============================================

-- 步骤 1: 诊断 - 查看当前 word_progress 表的状态分布
SELECT
  status,
  COUNT(*) as count
FROM word_progress
GROUP BY status
ORDER BY status;

-- 步骤 2: 诊断 - 查看当前约束
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS check_clause
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'word_progress'
  AND con.contype = 'C';

-- 步骤 3: 诊断 - 检查 word_progress 表是否启用了 RLS
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'word_progress';

-- 步骤 4: 修复 - 删除旧的检查约束
ALTER TABLE word_progress DROP CONSTRAINT IF EXISTS word_progress_status_check;

-- 步骤 5: 修复 - 创建新的检查约束，使用 'fuzzy' 而不是 'vague'
ALTER TABLE word_progress ADD CONSTRAINT word_progress_status_check
  CHECK (status IN ('new', 'known', 'fuzzy', 'unknown'));

-- 步骤 6: 修复 - 将现有的 'vague' 状态转换为 'fuzzy'
UPDATE word_progress
SET status = 'fuzzy'
WHERE status = 'vague';

-- 步骤 7: 验证 - 再次查看状态分布，确认修复成功
SELECT
  status,
  COUNT(*) as count
FROM word_progress
GROUP BY status
ORDER BY status;

-- 步骤 8: 验证 - 确认约束已更新
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS check_clause
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'word_progress'
  AND con.contype = 'C';

-- ============================================
-- 如果上述步骤执行后仍有问题，请运行以下诊断
-- ============================================

-- 查看所有用户及其 ID
SELECT id, email FROM auth.users;

-- 查看所有"不认识"、"模糊"、"新"状态的单词（按用户分组）
SELECT
  u.email,
  wp.status,
  COUNT(*) as word_count
FROM word_progress wp
JOIN auth.users u ON u.id = wp.user_id
WHERE wp.status IN ('unknown', 'fuzzy', 'new')
GROUP BY u.email, wp.status
ORDER BY u.email, wp.status;

-- 查看最近的错题记录（最新 10 条）
SELECT
  u.email,
  w.word,
  wp.status,
  wp.created_at,
  b.title as book_title
FROM word_progress wp
JOIN auth.users u ON u.id = wp.user_id
JOIN words w ON w.id = wp.word_id
LEFT JOIN books b ON b.id = wp.book_id
WHERE wp.status IN ('unknown', 'fuzzy', 'new')
ORDER BY wp.created_at DESC
LIMIT 10;
