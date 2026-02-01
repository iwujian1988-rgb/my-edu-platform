-- 删除 word_progress 表的触发器
-- 原因：触发器导致栈溢出（stack depth limit exceeded）
--
-- 解决方案：
-- 1. 在应用层手动维护 mistakes 和 vocabulary_calendar 表
-- 2. 删除触发器，避免循环依赖
--
-- 涉及的 API：
-- - /api/v3/word-mark (学习计划：卡片背单词、听写)
-- - /api/word-progress/batch-update (肌肉训练/打字练习)

-- ============================================
-- 删除触发器
-- ============================================

-- 删除错题本触发器
DROP TRIGGER IF EXISTS trigger_auto_add_mistakes ON word_progress;
DROP TRIGGER IF EXISTS trigger_add_to_mistakes ON word_progress;

-- 删除生词日历触发器
DROP TRIGGER IF EXISTS trigger_add_to_vocabulary_calendar ON word_progress;

-- ============================================
-- 删除触发器函数（可选，清理数据库）
-- ============================================

DROP FUNCTION IF EXISTS auto_add_mistakes();
DROP FUNCTION IF EXISTS add_to_mistakes();
DROP FUNCTION IF EXISTS add_to_vocabulary_calendar();

-- ============================================
-- 验证触发器已删除
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ word_progress 表的触发器已删除';
  RAISE NOTICE '现在由应用层手动维护 mistakes 和 vocabulary_calendar 表';
END
$$;
