-- ============================================================================
-- 学习计划系统 v4.0 升级迁移脚本
-- 版本: v4.0
-- 日期: 2026-01-30
-- 文档: prdeveryday.md v4.0
--
-- 核心变更:
-- 1. 删除 daily_max_words 字段
-- 2. 添加 review_ratio 字段（复习比例 1/2/3/4）
-- 3. 添加 uncompleted_words 字段（记录未完成的词）
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 步骤 1: 修改 learning_plans 表
-- ----------------------------------------------------------------------------

-- 1.1 添加新字段 review_ratio（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learning_plans'
    AND column_name = 'review_ratio'
  ) THEN
    ALTER TABLE learning_plans
    ADD COLUMN review_ratio INTEGER NOT NULL DEFAULT 3;

    RAISE NOTICE 'review_ratio 字段已添加';
  ELSE
    RAISE NOTICE 'review_ratio 字段已存在，跳过';
  END IF;
END $$;

-- 1.2 添加约束（只添加一次）
ALTER TABLE learning_plans
DROP CONSTRAINT IF EXISTS check_review_ratio;

ALTER TABLE learning_plans
ADD CONSTRAINT check_review_ratio
CHECK (review_ratio IN (1, 2, 3, 4));

-- 1.3 添加注释
COMMENT ON COLUMN learning_plans.review_ratio IS
'复习比例：1=1:1, 2=1:2, 3=1:3, 4=1:4';

COMMENT ON COLUMN learning_plans.daily_new_words IS
'每天新学单词数量（1-100）';

COMMENT ON COLUMN learning_plans.estimated_end_date IS
'预计结束日期（根据实际进度动态更新）';

-- 1.4 为现有数据设置默认值（如果有旧数据）
UPDATE learning_plans
SET review_ratio = 3
WHERE review_ratio IS NULL;

-- 1.5 删除旧字段（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learning_plans'
    AND column_name = 'daily_max_words'
  ) THEN
    ALTER TABLE learning_plans
    DROP COLUMN daily_max_words;

    RAISE NOTICE 'daily_max_words 字段已删除';
  ELSE
    RAISE NOTICE 'daily_max_words 字段不存在，跳过';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 步骤 2: 修改 daily_task_records 表
-- ----------------------------------------------------------------------------

-- 2.1 添加新字段 uncompleted_words（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_task_records'
    AND column_name = 'uncompleted_words'
  ) THEN
    ALTER TABLE daily_task_records
    ADD COLUMN uncompleted_words JSONB DEFAULT '[]';

    RAISE NOTICE 'uncompleted_words 字段已添加';
  ELSE
    RAISE NOTICE 'uncompleted_words 字段已存在，跳过';
  END IF;
END $$;

-- 2.2 添加注释
COMMENT ON COLUMN daily_task_records.uncompleted_words IS
'未完成的词ID数组（次日优先复习）';

-- 2.3 为现有数据初始化（如果有旧数据）
UPDATE daily_task_records
SET uncompleted_words = '[]'
WHERE uncompleted_words IS NULL;

-- ----------------------------------------------------------------------------
-- 步骤 3: 更新 get_learning_plan_progress 函数（v4.0 动态计算）
-- ----------------------------------------------------------------------------

-- 3.1 删除旧函数
DROP FUNCTION IF EXISTS get_learning_plan_progress(p_user_id UUID, p_book_id UUID);

-- 3.2 创建新函数（包含动态结束时间计算）
CREATE OR REPLACE FUNCTION get_learning_plan_progress(
  p_user_id UUID,
  p_book_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_plan RECORD;
  v_learned_words INTEGER;
  v_total_tasks INTEGER;
  v_completed_tasks INTEGER;
  v_streak INTEGER;
  v_progress NUMERIC;
  v_remaining_words INTEGER;
  v_remaining_ideal_days INTEGER;
  v_remaining_estimated_days INTEGER;
  v_estimated_end_date DATE;
BEGIN
  -- 获取学习计划
  SELECT * INTO v_plan
  FROM learning_plans
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- ✨ v4.0: 统计已学过的单词数（只看 known 状态）
  SELECT COUNT(DISTINCT word_id)
  INTO v_learned_words
  FROM word_progress
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND status = 'known';  -- ✨ v4.0: 只有"认识"才算学过

  -- 统计总任务数和完成任务数
  SELECT
    COUNT(*) FILTER (WHERE task_date <= CURRENT_DATE),
    COUNT(*) FILTER (WHERE all_completed = TRUE)
  INTO v_total_tasks, v_completed_tasks
  FROM daily_task_records
  WHERE user_id = p_user_id
    AND book_id = p_book_id;

  -- 计算连续打卡天数（简单实现）
  SELECT COUNT(DISTINCT task_date)
  INTO v_streak
  FROM daily_task_records
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND all_completed = TRUE
    AND task_date > CURRENT_DATE - INTERVAL '30 days';

  -- 计算进度百分比
  IF v_plan.total_words > 0 THEN
    v_progress := (v_learned_words::NUMERIC / v_plan.total_words::NUMERIC) * 100;
  ELSE
    v_progress := 0;
  END IF;

  -- ✨ v4.0: 动态计算结束时间
  v_remaining_words := GREATEST(v_plan.total_words - v_learned_words, 0);

  IF v_plan.daily_new_words > 0 THEN
    v_remaining_ideal_days := CEIL(v_remaining_words::NUMERIC / v_plan.daily_new_words);
    v_remaining_estimated_days := CEIL(v_remaining_ideal_days * 1.5);  -- 考虑复习
  ELSE
    v_remaining_ideal_days := 0;
    v_remaining_estimated_days := 0;
  END IF;

  -- 计算预计结束日期
  v_estimated_end_date := CURRENT_DATE + v_remaining_estimated_days;

  -- ✨ v4.0: 同时更新 learning_plans 表的 estimated_end_date
  UPDATE learning_plans
  SET estimated_end_date = v_estimated_end_date
  WHERE id = v_plan.id;

  RETURN jsonb_build_object(
    'plan_id', v_plan.id,
    'total_words', v_plan.total_words,
    'learned_words', v_learned_words,
    'progress_percentage', ROUND(v_progress, 2),
    'daily_new_words', v_plan.daily_new_words,
    'review_ratio', v_plan.review_ratio,  -- ✨ v4.0
    'total_tasks', v_total_tasks,
    'completed_tasks', v_completed_tasks,
    'streak_days', v_streak,
    -- ✨ v4.0 新增字段
    'completed_days', v_completed_tasks,
    'remaining_days', v_remaining_estimated_days,
    'estimated_end_date', v_estimated_end_date
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_learning_plan_progress IS
'✨ v4.0: 计算学习计划的整体进度（包含动态结束时间计算）';

-- ----------------------------------------------------------------------------
-- 步骤 3: 数据迁移（从旧的 daily_max_words 转换为 review_ratio）
-- ----------------------------------------------------------------------------

-- 注意：由于 daily_max_words 可能已被删除，此步骤仅供参考
-- 如果仍有旧数据，可以执行以下逻辑：
-- UPDATE learning_plans
-- SET review_ratio = LEAST(GREATEST(
--   ROUND(CAST(daily_max_words AS NUMERIC) / NULLIF(daily_new_words, 0)),
--   1), 4)
-- WHERE review_ratio IS NULL OR review_ratio = 0;

-- ----------------------------------------------------------------------------
-- 步骤 4: 验证迁移
-- ----------------------------------------------------------------------------

-- 验证表结构
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'learning_plans'
ORDER BY ordinal_position;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'daily_task_records'
ORDER BY ordinal_position;

-- 验证约束
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'learning_plans'::regclass
AND conname = 'check_review_ratio';

-- ============================================================================
-- 迁移完成
-- ============================================================================
-- 下一步：
-- 1. 更新 TypeScript 类型定义
-- 2. 修改 API 接口
-- 3. 更新前端 UI
-- ============================================================================
