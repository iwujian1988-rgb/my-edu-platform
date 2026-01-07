-- 完整修复脚本：删除触发器并修复约束
-- 请在 Supabase SQL Editor 中执行

-- ============================================
-- 1. 删除所有相关触发器和函数
-- ============================================
DROP TRIGGER IF EXISTS trigger_auto_add_mistakes ON word_progress;
DROP FUNCTION IF EXISTS auto_add_mistakes();

DROP TRIGGER IF EXISTS trigger_add_to_mistakes ON word_progress;
DROP FUNCTION IF EXISTS add_to_mistakes();

DROP TRIGGER IF EXISTS trigger_add_to_vocabulary_calendar ON word_progress;
DROP FUNCTION IF EXISTS add_to_vocabulary_calendar();

-- ============================================
-- 2. 修复 word_progress 表的检查约束
-- ============================================
ALTER TABLE word_progress DROP CONSTRAINT IF EXISTS word_progress_status_check;

ALTER TABLE word_progress ADD CONSTRAINT word_progress_status_check
  CHECK (status IN ('new', 'known', 'fuzzy', 'unknown'));

-- ============================================
-- 3. 验证修复结果
-- ============================================

-- 应该返回 0 行（没有触发器）
SELECT '触发器检查（应该返回 0 行）' as info;
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public.word_progress'::regclass
AND (tgname LIKE '%mistakes%' OR tgname LIKE '%vocabulary%');

-- 应该显示包含所有 4 个状态的约束
SELECT '约束检查（应该包含 new, known, fuzzy, unknown）' as info;
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS check_clause
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'word_progress'
  AND con.contype = 'C';
