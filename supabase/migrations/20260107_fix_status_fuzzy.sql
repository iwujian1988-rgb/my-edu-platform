-- 修复状态值不一致问题：将 'vague' 改为 'fuzzy'
-- 问题：schema.sql 使用 'vague'，但代码中使用 'fuzzy'
-- 影响：导致标记为"模糊"的单词无法正确保存，且无法在错题本中显示

-- 1. 删除旧的检查约束
ALTER TABLE word_progress DROP CONSTRAINT IF EXISTS word_progress_status_check;

-- 2. 创建新的检查约束，使用 'fuzzy' 而不是 'vague'
ALTER TABLE word_progress ADD CONSTRAINT word_progress_status_check
  CHECK (status IN ('new', 'known', 'fuzzy', 'unknown'));

-- 3. 将现有的 'vague' 状态转换为 'fuzzy'
UPDATE word_progress
SET status = 'fuzzy'
WHERE status = 'vague';

-- 4. 验证转换结果
SELECT
  status,
  COUNT(*) as count
FROM word_progress
GROUP BY status
ORDER BY status;

-- 5. 验证约束是否正确
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS check_clause
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'word_progress'
  AND con.contype = 'C';
