-- ============================================================================
-- 定时任务预生成今日学习计划
-- ============================================================================
-- 版本: v1.0.0
-- 日期: 2026-01-28
-- 功能: 使用 pg_cron 在每天凌晨预生成所有活跃学习计划的今日任务
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 启用 pg_cron 扩展
-- ----------------------------------------------------------------------------

-- 检查并启用 pg_cron 扩展
CREATE EXTENSION IF NOT EXISTS pg_cron;

COMMENT ON EXTENSION pg_cron IS
'定时任务调度扩展，用于在指定时间执行 SQL 函数';

-- ----------------------------------------------------------------------------
-- 2. 创建批量生成今日任务的函数
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_all_daily_tasks()
RETURNS JSONB AS $$
DECLARE
  v_active_plans RECORD;
  v_generated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_today DATE := CURRENT_DATE;
  v_error_message TEXT;
BEGIN
  -- 遍历所有活跃的学习计划
  FOR v_active_plans IN
    SELECT id, user_id, book_id, daily_new_words, daily_max_words
    FROM learning_plans
    WHERE status = 'active'
  LOOP
    BEGIN
      -- 检查今日任务是否已存在
      IF EXISTS (
        SELECT 1
        FROM daily_task_records
        WHERE user_id = v_active_plans.user_id
          AND book_id = v_active_plans.book_id
          AND task_date = v_today
      ) THEN
        -- 今日任务已存在，跳过
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;

      -- 生成今日任务（调用内部生成逻辑）
      PERFORM generate_daily_task_for_plan(
        v_active_plans.user_id,
        v_active_plans.book_id,
        v_active_plans.id,
        v_active_plans.daily_new_words,
        v_active_plans.daily_max_words,
        v_today
      );

      v_generated_count := v_generated_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- 记录错误但继续处理其他计划
      v_error_count := v_error_count + 1;
      v_error_message := SQLERRM;
      v_errors := v_errors || jsonb_build_object(
        'plan_id', v_active_plans.id,
        'user_id', v_active_plans.user_id,
        'book_id', v_active_plans.book_id,
        'error', v_error_message
      );
    END;
  END LOOP;

  -- 返回执行结果
  RETURN jsonb_build_object(
    'success', TRUE,
    'date', v_today::TEXT,
    'generated', v_generated_count,
    'skipped', v_skipped_count,
    'errors', v_error_count,
    'error_details', v_errors,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION generate_all_daily_tasks IS
'批量生成所有活跃学习计划的今日任务（由 pg_cron 定时调用）';

-- ----------------------------------------------------------------------------
-- 3. 创建单个计划的今日任务生成函数
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_daily_task_for_plan(
  p_user_id UUID,
  p_book_id UUID,
  p_plan_id UUID,
  p_daily_new_words INTEGER,
  p_daily_max_words INTEGER,
  p_task_date DATE DEFAULT CURRENT_DATE
) RETURNS UUID AS $$
DECLARE
  v_review_words JSONB := '[]'::JSONB;
  v_new_words JSONB := '[]'::JSONB;
  v_review_count INTEGER := 0;
  v_new_count INTEGER := 0;
  v_remaining_slots INTEGER;
  v_plan_day INTEGER;
  v_task_id UUID;
  v_word_record RECORD;
BEGIN
  -- 1. 获取今日需要复习的单词（按优先级排序）
  FOR v_word_record IN
    SELECT word_id, review_count
    FROM review_schedule
    WHERE user_id = p_user_id
      AND book_id = p_book_id
      AND next_review_date <= p_task_date
    ORDER BY next_review_date ASC
    LIMIT p_daily_max_words
  LOOP
    v_review_words := v_review_words || v_word_record.word_id::JSONB;
    v_review_count := v_review_count + 1;
  END LOOP;

  -- 2. 计算剩余名额和新学词数量
  v_remaining_slots := p_daily_max_words - v_review_count;
  v_new_count := LEAST(p_daily_new_words, v_remaining_slots);

  IF v_new_count < 0 THEN
    v_new_count := 0;
  END IF;

  -- 3. 获取未学过的单词（随机抽取）
  IF v_new_count > 0 THEN
    FOR v_word_record IN
      SELECT id
      FROM words
      WHERE book_id = p_book_id
        AND id NOT IN (
          SELECT word_id
          FROM word_progress
          WHERE user_id = p_user_id
            AND book_id = p_book_id
        )
      ORDER BY RANDOM()
      LIMIT v_new_count
    LOOP
      v_new_words := v_new_words || v_word_record.id::JSONB;
    END LOOP;
  END IF;

  -- 4. 计算是第几天
  SELECT COALESCE(COUNT(*), 0) + 1
  INTO v_plan_day
  FROM daily_task_records
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND task_date < p_task_date;

  -- 5. 创建今日任务记录
  INSERT INTO daily_task_records (
    user_id,
    book_id,
    plan_id,
    task_date,
    plan_day,
    new_words,
    review_words,
    completed_words,
    all_completed,
    started_at
  ) VALUES (
    p_user_id,
    p_book_id,
    p_plan_id,
    p_task_date,
    v_plan_day,
    v_new_words,
    v_review_words,
    '[]'::JSONB,
    FALSE,
    NOW()
  )
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION generate_daily_task_for_plan IS
'为单个学习计划生成今日任务（内部函数）';

-- ----------------------------------------------------------------------------
-- 4. 创建 pg_cron 定时任务
-- ----------------------------------------------------------------------------

-- 注意：pg_cron.job 表可能不存在，需要先创建或使用 cron.schedule 函数
-- 这里使用 cron.schedule 函数（推荐方式）

-- 安全地删除旧任务（如果存在）并创建新任务
DO $$
BEGIN
  -- 尝试删除旧任务（忽略不存在的错误）
  PERFORM cron.unschedule('generate-daily-tasks');
EXCEPTION
  WHEN OTHERS THEN
    -- 任务不存在或删除失败，忽略错误继续执行
    RAISE NOTICE 'Old job does not exist or could not be removed, continuing...';
END
$$;

-- 创建新的定时任务（使用带参数类型的语法）
PERFORM cron.schedule(
  'generate-daily-tasks'::TEXT,
  '0 0 * * *'::TEXT,
  $$SELECT generate_all_daily_tasks();$$::TEXT
);

COMMENT ON FUNCTION cron.schedule IS
'定时任务：每天凌晨 00:00 生成所有活跃学习计划的今日任务';

-- ----------------------------------------------------------------------------
-- 5. 创建手动触发函数（用于测试和管理）
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_daily_task_generation()
RETURNS JSONB AS $$
BEGIN
  RETURN generate_all_daily_tasks();
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION trigger_daily_task_generation IS
'手动触发今日任务生成（用于测试或紧急情况）';

-- ----------------------------------------------------------------------------
-- 6. 创建清理旧任务的函数（可选）
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cleanup_old_daily_tasks(
  p_days_to_keep INTEGER DEFAULT 90
) RETURNS JSONB AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- 删除超过指定天数的已完成任务记录
  DELETE FROM daily_task_records
  WHERE task_date < CURRENT_DATE - p_days_to_keep
    AND all_completed = TRUE;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', TRUE,
    'deleted_count', v_deleted_count,
    'days_kept', p_days_to_keep,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_daily_tasks IS
'清理旧的已完成任务记录（默认保留90天）';

-- ----------------------------------------------------------------------------
-- 7. 授权
-- ----------------------------------------------------------------------------

-- 允许认证用户调用手动触发函数
GRANT EXECUTE ON FUNCTION trigger_daily_task_generation TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_daily_tasks TO authenticated;

-- pg_cron 需要超级用户权限，已在 SECURITY DEFINER 中处理

-- ----------------------------------------------------------------------------
-- 8. 验证和测试
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  v_cron_job_exists BOOLEAN;
BEGIN
  -- 检查定时任务是否创建成功
  SELECT EXISTS(
    SELECT 1
    FROM cron.job
    WHERE jobname = 'generate-daily-tasks'
  ) INTO v_cron_job_exists;

  IF v_cron_job_exists THEN
    RAISE NOTICE '✅ 定时任务创建成功: generate-daily-tasks';
    RAISE NOTICE '   执行时间: 每天 00:00 (凌晨)';
  ELSE
    RAISE WARNING '⚠️  定时任务创建失败，请检查 pg_cron 扩展是否正确安装';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '定时任务预生成系统已安装';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 批量生成函数: generate_all_daily_tasks()';
  RAISE NOTICE '✅ 单个计划函数: generate_daily_task_for_plan()';
  RAISE NOTICE '✅ 手动触发函数: trigger_daily_task_generation()';
  RAISE NOTICE '✅ 清理旧任务函数: cleanup_old_daily_tasks()';
  RAISE NOTICE '';
  RAISE NOTICE '测试方法：';
  RAISE NOTICE '  SELECT trigger_daily_task_generation();';
  RAISE NOTICE '';
  RAISE NOTICE '查看定时任务：';
  RAISE NOTICE '  SELECT * FROM cron.job WHERE jobname = ''generate-daily-tasks'';';
  RAISE NOTICE '========================================';
END
$$;
