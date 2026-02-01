-- ============================================================================
-- 补充功能：延迟检测和状态管理
-- ============================================================================
-- 版本: v1.1.0
-- 日期: 2026-01-28
-- 功能: 检测学习计划延迟、管理计划状态
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 检测学习计划延迟
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_plan_delay_status(
  p_user_id UUID,
  p_book_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_plan RECORD;
  v_last_task_date DATE;
  v_days_since_last_task INTEGER;
  v_is_delayed BOOLEAN;
  v_delayed_days INTEGER;
BEGIN
  -- 获取学习计划
  SELECT * INTO v_plan
  FROM learning_plans
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_plan', FALSE,
      'is_delayed', FALSE
    );
  END IF;

  -- 获取最后一个完成的任务日期
  SELECT MAX(task_date) INTO v_last_task_date
  FROM daily_task_records
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND all_completed = TRUE;

  -- 计算距离上次学习的天数
  IF v_last_task_date IS NULL THEN
    -- 从未完成过任何任务
    v_days_since_last_task := 0;
  ELSE
    v_days_since_last_task := CURRENT_DATE - v_last_task_date;
  END IF;

  -- 判断是否延迟（连续3天没学习）
  v_is_delayed := v_days_since_last_task >= 3;
  v_delayed_days := v_days_since_last_task;

  -- 如果延迟，更新计划状态为 'delayed'
  IF v_is_delayed THEN
    UPDATE learning_plans
    SET status = 'delayed',
        updated_at = NOW()
    WHERE id = v_plan.id;
  END IF;

  RETURN jsonb_build_object(
    'has_plan', TRUE,
    'is_delayed', v_is_delayed,
    'delayed_days', v_delayed_days,
    'last_task_date', v_last_task_date,
    'plan_id', v_plan.id
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION check_plan_delay_status IS
'检测学习计划是否延迟（连续3天没学习）';

-- ----------------------------------------------------------------------------
-- 2. 获取积压的复习词数量
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_backlogged_review_count(
  p_user_id UUID,
  p_book_id UUID,
  p_daily_max_words INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_total_due INTEGER;
  v_overdue_count INTEGER;
  v_can_fit_today INTEGER;
  v_backlog_count INTEGER;
BEGIN
  -- 获取所有到期需要复习的词
  SELECT COUNT(*)
  INTO v_total_due
  FROM review_schedule
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND next_review_date <= CURRENT_DATE;

  -- 获取过期的复习词（超过7天的）
  SELECT COUNT(*)
  INTO v_overdue_count
  FROM review_schedule
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND next_review_date < CURRENT_DATE - INTERVAL '7 days';

  -- 能在今天完成的数量
  v_can_fit_today := LEAST(v_total_due, p_daily_max_words);

  -- 积压的数量
  v_backlog_count := GREATEST(v_total_due - p_daily_max_words, 0);

  RETURN jsonb_build_object(
    'total_due', v_total_due,
    'overdue_count', v_overdue_count,
    'can_fit_today', v_can_fit_today,
    'backlog_count', v_backlog_count,
    'has_backlog', v_backlog_count > 0
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_backlogged_review_count IS
'获取积压的复习词统计信息';

-- ----------------------------------------------------------------------------
-- 3. 检查单词书是否学完
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_book_completion(
  p_user_id UUID,
  p_book_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_book RECORD;
  v_learned_words INTEGER;
  v_total_words INTEGER;
  v_is_completed BOOLEAN;
  v_remaining_words INTEGER;
BEGIN
  -- 获取单词书信息
  SELECT total_words INTO v_total_words
  FROM books
  WHERE id = p_book_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_book', FALSE
    );
  END IF;

  -- 统计已学过的单词（学过至少一次）
  SELECT COUNT(DISTINCT word_id)
  INTO v_learned_words
  FROM word_progress
  WHERE user_id = p_user_id
    AND book_id = p_book_id;

  -- 判断是否学完
  v_is_completed := v_learned_words >= v_total_words;
  v_remaining_words := GREATEST(v_total_words - v_learned_words, 0);

  -- 如果学完，更新计划状态
  IF v_is_completed THEN
    UPDATE learning_plans
    SET status = 'completed',
        actual_end_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND book_id = p_book_id
      AND status = 'active';
  END IF;

  RETURN jsonb_build_object(
    'has_book', TRUE,
    'is_completed', v_is_completed,
    'learned_words', v_learned_words,
    'total_words', v_total_words,
    'remaining_words', v_remaining_words,
    'progress_percentage', ROUND((v_learned_words::NUMERIC / v_total_words::NUMERIC) * 100, 2)
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION check_book_completion IS
'检查单词书是否学完';

-- ----------------------------------------------------------------------------
-- 4. 暂停/恢复学习计划
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION toggle_plan_status(
  p_user_id UUID,
  p_book_id UUID,
  p_new_status TEXT
) RETURNS JSONB AS $$
DECLARE
  v_plan RECORD;
BEGIN
  -- 验证状态值
  IF p_new_status NOT IN ('active', 'paused', 'completed', 'delayed') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  -- 获取学习计划
  SELECT * INTO v_plan
  FROM learning_plans
  WHERE user_id = p_user_id
    AND book_id = p_book_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Learning plan not found';
  END IF;

  -- 更新状态
  UPDATE learning_plans
  SET status = p_new_status,
      updated_at = NOW()
  WHERE id = v_plan.id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'old_status', v_plan.status,
    'new_status', p_new_status,
    'plan_id', v_plan.id
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION toggle_plan_status IS
'暂停/恢复/完成学习计划';

-- ----------------------------------------------------------------------------
-- 5. 增强的今日任务生成（包含状态检查）
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_daily_task_with_checks(
  p_user_id UUID,
  p_book_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_plan RECORD;
  v_delay_check JSONB;
  v_completion_check JSONB;
  v_backlog_check JSONB;
  v_task_id UUID;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- 检查学习计划是否存在
  SELECT * INTO v_plan
  FROM learning_plans
  WHERE user_id = p_user_id
    AND book_id = p_book_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Learning plan not found'
    );
  END IF;

  -- 检查是否已学完
  SELECT check_book_completion(p_user_id, p_book_id)
  INTO v_completion_check;

  IF (v_completion_check->>'is_completed')::BOOLEAN = TRUE THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Book already completed',
      'completion_data', v_completion_check
    );
  END IF;

  -- 检查延迟状态
  SELECT check_plan_delay_status(p_user_id, p_book_id)
  INTO v_delay_check;

  -- 获取积压信息
  SELECT get_backlogged_review_count(p_user_id, p_book_id, v_plan.daily_max_words)
  INTO v_backlog_check;

  -- 检查今日任务是否已存在
  IF EXISTS (
    SELECT 1
    FROM daily_task_records
    WHERE user_id = p_user_id
      AND book_id = p_book_id
      AND task_date = v_today
  ) THEN
    -- 今日任务已存在，返回现有任务信息
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Task already exists',
      'delay_check', v_delay_check,
      'backlog_check', v_backlog_check,
      'completion_check', v_completion_check
    );
  END IF;

  -- 生成今日任务
  v_task_id := generate_daily_task_for_plan(
    p_user_id,
    p_book_id,
    v_plan.id,
    v_plan.daily_new_words,
    v_plan.daily_max_words,
    v_today
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Task generated successfully',
    'task_id', v_task_id,
    'delay_check', v_delay_check,
    'backlog_check', v_backlog_check,
    'completion_check', v_completion_check,
    'warnings', jsonb_build_array(
      CASE
        WHEN (v_delay_check->>'is_delayed')::BOOLEAN = TRUE
        THEN jsonb_build_object(
          'type', 'delay',
          'message', '学习计划已延迟',
          'days', (v_delay_check->>'delayed_days')::INTEGER
        )
      END,
      CASE
        WHEN (v_backlog_check->>'has_backlog')::BOOLEAN = TRUE
        THEN jsonb_build_object(
          'type', 'backlog',
          'message', '有积压的复习词',
          'backlog_count', (v_backlog_check->>'backlog_count')::INTEGER
        )
      END
    )
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION generate_daily_task_with_checks IS
'增强的今日任务生成（包含状态检查和警告）';

-- ----------------------------------------------------------------------------
-- 6. 授权
-- ----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION check_plan_delay_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_backlogged_review_count TO authenticated;
GRANT EXECUTE ON FUNCTION check_book_completion TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_plan_status TO authenticated;
GRANT EXECUTE ON FUNCTION generate_daily_task_with_checks TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. 验证
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '补充功能已安装';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 延迟检测: check_plan_delay_status()';
  RAISE NOTICE '✅ 积压统计: get_backlogged_review_count()';
  RAISE NOTICE '✅ 完成检测: check_book_completion()';
  RAISE NOTICE '✅ 状态管理: toggle_plan_status()';
  RAISE NOTICE '✅ 增强生成: generate_daily_task_with_checks()';
  RAISE NOTICE '';
  RAISE NOTICE '测试方法：';
  RAISE NOTICE '  SELECT check_plan_delay_status(user_id, book_id);';
  RAISE NOTICE '  SELECT get_backlogged_review_count(user_id, book_id, 50);';
  RAISE NOTICE '  SELECT check_book_completion(user_id, book_id);';
  RAISE NOTICE '========================================';
END
$$;
