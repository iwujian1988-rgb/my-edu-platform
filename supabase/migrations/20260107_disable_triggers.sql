-- 禁用触发器，改为在 API 层面处理错题本逻辑
-- 原因：触发器在 RLS 环境下无法向 mistakes 表插入数据

-- 1. 删除错题本触发器
DROP TRIGGER IF EXISTS trigger_add_to_mistakes ON word_progress;
DROP FUNCTION IF EXISTS add_to_mistakes();

-- 2. 删除生词日历触发器（可选，如果不需要的话）
DROP TRIGGER IF EXISTS trigger_add_to_vocabulary_calendar ON word_progress;
DROP FUNCTION IF EXISTS add_to_vocabulary_calendar();

-- 3. 修复 word_progress 表的检查约束（如果还没有修复）
ALTER TABLE word_progress DROP CONSTRAINT IF EXISTS word_progress_status_check;
ALTER TABLE word_progress ADD CONSTRAINT word_progress_status_check
  CHECK (status IN ('new', 'known', 'fuzzy', 'unknown'));

-- 验证约束
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS check_clause
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'word_progress'
  AND con.contype = 'C';
