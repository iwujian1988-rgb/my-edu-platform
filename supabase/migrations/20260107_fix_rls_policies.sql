-- 修复 word_progress 表的检查约束和 mistakes 表的 RLS 策略
-- 问题：数据库只允许插入 'known' 状态，不允许 'unknown', 'fuzzy', 'new'

-- 1. 删除旧的检查约束
ALTER TABLE word_progress DROP CONSTRAINT IF EXISTS word_progress_status_check;

-- 2. 创建新的检查约束，允许所有有效状态
ALTER TABLE word_progress ADD CONSTRAINT word_progress_status_check
  CHECK (status IN ('new', 'known', 'fuzzy', 'unknown'));

-- 3. 检查 mistakes 表的 RLS 策略
-- 注意：需要根据实际情况调整，这里提供示例

-- 4. 创建/替换 mistakes 表的 RLS 策略（如果存在）
-- CREATE POLICY "Users can insert their own mistakes" ON mistakes FOR INSERT
--   WITH CHECK (user_id = auth.uid());

-- 5. 如果使用的是 triggers 而不是 RLS，也需要修复
-- CREATE TRIGGER update_word_progress_mistakes_count() ...

-- 6. 验证约束是否正确（使用 pg_constraint）
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS check_clause
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'word_progress'
  AND con.contype = 'C';

-- 7. 测试插入不同状态（可以取消注释测试）
-- INSERT INTO word_progress (user_id, word_id, book_id, status)
-- VALUES
--   ('7078b0aa-d06a-4209-b669-1a0d4985c8ea', 'test-word-1', 'book-1', 'unknown'),
--   ('7078b0aa-d06a-4209-b669-1a0d4985c8ea', 'test-word-2', 'book-1', 'fuzzy'),
--   ('7078b0aa-d06a-4209-b669-1a0d4985c8ea', 'test-word-3', 'book-1', 'known');
