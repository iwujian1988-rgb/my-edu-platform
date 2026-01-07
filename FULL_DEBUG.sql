-- ============================================
-- 全面诊断 word_progress 表
-- ============================================

-- 1. 查看 word_progress 表的所有约束（不限制条件）
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS check_clause
FROM pg_constraint con
WHERE con.conrelid = 'word_progress'::regclass;

-- 2. 查看 word_progress 表的所有记录（所有用户）
SELECT COUNT(*) as total_records FROM word_progress;

-- 3. 查看是否有任何 word_progress 记录
SELECT * FROM word_progress LIMIT 5;

-- 4. 检查 word_progress 表结构
\d word_progress
