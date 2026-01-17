-- 检查并修复 user_book_preferences 表的 last_resume_state 字段
-- 日期: 2026-01-14
-- 问题: 如果之前的 migration 没有运行，此表可能缺少 last_resume_state 字段

-- 1. 添加 last_resume_state 字段（如果不存在）
DO $$
BEGIN
  -- 检查字段是否存在，如果不存在则添加
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_book_preferences'
    AND column_name = 'last_resume_state'
  ) THEN
    ALTER TABLE user_book_preferences
    ADD COLUMN last_resume_state JSONB DEFAULT '{}'::jsonb;

    RAISE NOTICE '✅ 已添加 last_resume_state 字段';
  ELSE
    RAISE NOTICE 'ℹ️  last_resume_state 字段已存在';
  END IF;
END
$$;

-- 2. 添加注释（如果还没有）
COMMENT ON COLUMN user_book_preferences.last_resume_state IS '用户最后的学习状态，用于恢复学习位置。结构：{ mode, bookId, context: {...}, updatedAt }';

-- 3. 验证字段是否创建成功
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_book_preferences'
AND column_name = 'last_resume_state';

-- 4. 测试插入（使用虚拟数据）
-- 注意：这只是为了验证字段可以正常工作
-- SELECT
--   '{}'::jsonb AS test_resume_state
-- LIMIT 1;
