-- 修复 get_learning_plan_progress 函数的稳定性级别
-- 因为函数内部包含 UPDATE 语句，必须声明为 VOLATILE

CREATE OR REPLACE FUNCTION get_learning_plan_progress(
  p_user_id UUID,
  p_book_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_plan RECORD;
  v_learned_words INTEGER;        -- [Legacy] v4.0: 只统计 known
  v_marked_words INTEGER;         -- [Upgrade] 两阶段: 统计所有标记
  v_known_words INTEGER;
  v_fuzzy_words INTEGER;
  v_unknown_words INTEGER;
  v_total_tasks INTEGER;
  v_completed_tasks INTEGER;
  v_streak INTEGER;
  v_old_progress NUMERIC;         -- [Legacy] v4.0 进度
  v_new_progress NUMERIC;         -- [Upgrade] 两阶段进度
  v_remaining_words INTEGER;
  v_remaining_ideal_days INTEGER;
  v_remaining_estimated_days INTEGER;
  v_estimated_end_date DATE;
  v_plan_phase TEXT;
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

  -- [Legacy] v4.0: 统计已学过的单词数（只看 known 状态）
  SELECT COUNT(DISTINCT word_id)
  INTO v_learned_words
  FROM word_progress
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND status = 'known';

  -- [Upgrade] 两阶段系统：统计所有标记过的词（任何状态）
  SELECT COUNT(DISTINCT word_id)
  INTO v_marked_words
  FROM word_progress
  WHERE user_id = p_user_id
    AND book_id = p_book_id;

  -- [Upgrade] 两阶段系统：统计各状态的词数
  SELECT
    COUNT(*) FILTER (WHERE status = 'known'),
    COUNT(*) FILTER (WHERE status = 'fuzzy'),
    COUNT(*) FILTER (WHERE status = 'unknown')
  INTO v_known_words, v_fuzzy_words, v_unknown_words
  FROM word_progress
  WHERE user_id = p_user_id
    AND book_id = p_book_id;

  -- 统计总任务数和完成任务数
  SELECT
    COUNT(*) FILTER (WHERE task_date <= CURRENT_DATE),
    COUNT(*) FILTER (WHERE all_completed = TRUE)
  INTO v_total_tasks, v_completed_tasks
  FROM daily_task_records
  WHERE user_id = p_user_id
    AND book_id = p_book_id;

  -- 计算连续打卡天数
  SELECT COUNT(DISTINCT task_date)
  INTO v_streak
  FROM daily_task_records
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND all_completed = TRUE
    AND task_date > CURRENT_DATE - INTERVAL '30 days';

  -- [Legacy] v4.0: 计算进度百分比（基于 known）
  IF v_plan.total_words > 0 THEN
    v_old_progress := (v_learned_words::NUMERIC / v_plan.total_words::NUMERIC) * 100;
  ELSE
    v_old_progress := 0;
  END IF;

  -- [Upgrade] 两阶段系统：计算进度百分比（基于 marked）
  IF v_plan.total_words > 0 THEN
    v_new_progress := (v_marked_words::NUMERIC / v_plan.total_words::NUMERIC) * 100;
  ELSE
    v_new_progress := 0;
  END IF;

  -- 动态计算结束时间（基于 marked）
  v_remaining_words := GREATEST(v_plan.total_words - v_marked_words, 0);

  IF v_plan.daily_new_words > 0 THEN
    v_remaining_ideal_days := CEIL(v_remaining_words::NUMERIC / v_plan.daily_new_words);
    v_remaining_estimated_days := CEIL(v_remaining_ideal_days * 1.5);
  ELSE
    v_remaining_ideal_days := 0;
    v_remaining_estimated_days := 0;
  END IF;

  v_estimated_end_date := CURRENT_DATE + v_remaining_estimated_days;

  -- 同时更新 learning_plans 表的 estimated_end_date
  UPDATE learning_plans
  SET estimated_end_date = v_estimated_end_date
  WHERE id = v_plan.id;

  -- 获取当前阶段（默认为 legacy）
  v_plan_phase := v_plan.phase;

  -- [Upgrade] 两阶段系统：返回完整数据（包含新旧统计）
  RETURN jsonb_build_object(
    -- [Legacy] v4.0 字段（保持兼容）
    'plan_id', v_plan.id,
    'total_words', v_plan.total_words,
    'learned_words', v_learned_words,
    'progress_percentage', ROUND(v_old_progress, 2),
    'daily_new_words', v_plan.daily_new_words,
    'review_ratio', v_plan.review_ratio,
    'total_tasks', v_total_tasks,
    'completed_tasks', v_completed_tasks,
    'streak_days', v_streak,
    'completed_days', v_completed_tasks,
    'remaining_days', v_remaining_estimated_days,
    'estimated_end_date', v_estimated_end_date,

    -- [Upgrade] 两阶段系统：新字段
    'phase', COALESCE(v_plan_phase, 'legacy'),
    'marked_words', v_marked_words,
    'marked_percentage', ROUND(v_new_progress, 2),
    'known_words', v_known_words,
    'fuzzy_words', v_fuzzy_words,
    'unknown_words', v_unknown_words,
    'learning_phase_completed_at', v_plan.learning_phase_completed_at,
    'review_phase_started_at', v_plan.review_phase_started_at
  );
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION get_learning_plan_progress IS
'[Upgrade] 两阶段系统：计算学习计划进度（同时返回新旧统计，保持向后兼容）';
