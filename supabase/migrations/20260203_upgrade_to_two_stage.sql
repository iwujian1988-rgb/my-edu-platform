-- ============================================================================
-- 两阶段学习系统升级（兼容性优先）
-- ============================================================================
-- 版本: v1.0
-- 日期: 2026-02-03
-- 设计原则: 向后兼容、渐进式迁移、可灰度发布
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 步骤 1: 扩展 learning_plans 表（添加阶段字段）
-- ----------------------------------------------------------------------------

-- 1.1 添加 phase 字段（默认值 'learning' 启用两阶段系统）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learning_plans'
    AND column_name = 'phase'
  ) THEN
    ALTER TABLE learning_plans
    ADD COLUMN phase TEXT DEFAULT 'learning'
    CHECK (phase IN ('legacy', 'learning', 'review'));

    RAISE NOTICE '✅ phase 字段已添加';
  ELSE
    RAISE NOTICE 'phase 字段已存在，跳过';
  END IF;
END $$;

-- 1.2 添加注释
COMMENT ON COLUMN learning_plans.phase IS
'学习阶段: legacy(旧逻辑-兼容模式) | learning(学习阶段-新功能) | review(复习阶段-新功能)';

-- 1.3 添加学习阶段完成时间字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learning_plans'
    AND column_name = 'learning_phase_completed_at'
  ) THEN
    ALTER TABLE learning_plans
    ADD COLUMN learning_phase_completed_at TIMESTAMPTZ;

    RAISE NOTICE '✅ learning_phase_completed_at 字段已添加';
  END IF;
END $$;

COMMENT ON COLUMN learning_plans.learning_phase_completed_at IS
'学习阶段完成时间（两阶段系统）';

-- 1.4 添加复习阶段开始时间字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learning_plans'
    AND column_name = 'review_phase_started_at'
  ) THEN
    ALTER TABLE learning_plans
    ADD COLUMN review_phase_started_at TIMESTAMPTZ;

    RAISE NOTICE '✅ review_phase_started_at 字段已添加';
  END IF;
END $$;

COMMENT ON COLUMN learning_plans.review_phase_started_at IS
'复习阶段开始时间（两阶段系统）';

-- ----------------------------------------------------------------------------
-- 步骤 2: 扩展 daily_task_records 表（添加详细标记统计）
-- ----------------------------------------------------------------------------

-- 2.1 添加 marked_words 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_task_records'
    AND column_name = 'marked_words'
  ) THEN
    ALTER TABLE daily_task_records
    ADD COLUMN marked_words JSONB DEFAULT '[]';

    RAISE NOTICE '✅ marked_words 字段已添加';
  END IF;
END $$;

COMMENT ON COLUMN daily_task_records.marked_words IS
'已标记（任何状态）的词ID数组（两阶段系统）';

-- 2.2 添加 known_words 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_task_records'
    AND column_name = 'known_words'
  ) THEN
    ALTER TABLE daily_task_records
    ADD COLUMN known_words JSONB DEFAULT '[]';

    RAISE NOTICE '✅ known_words 字段已添加';
  END IF;
END $$;

COMMENT ON COLUMN daily_task_records.known_words IS
'标记为"认识"的词ID数组（两阶段系统）';

-- 2.3 添加 fuzzy_words 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_task_records'
    AND column_name = 'fuzzy_words'
  ) THEN
    ALTER TABLE daily_task_records
    ADD COLUMN fuzzy_words JSONB DEFAULT '[]';

    RAISE NOTICE '✅ fuzzy_words 字段已添加';
  END IF;
END $$;

COMMENT ON COLUMN daily_task_records.fuzzy_words IS
'标记为"模糊"的词ID数组（两阶段系统）';

-- 2.4 添加 unknown_words 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_task_records'
    AND column_name = 'unknown_words'
  ) THEN
    ALTER TABLE daily_task_records
    ADD COLUMN unknown_words JSONB DEFAULT '[]';

    RAISE NOTICE '✅ unknown_words 字段已添加';
  END IF;
END $$;

COMMENT ON COLUMN daily_task_records.unknown_words IS
'标记为"不认识"的词ID数组（两阶段系统）';

-- 2.5 添加 all_marked 字段（两阶段系统的完成标志）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_task_records'
    AND column_name = 'all_marked'
  ) THEN
    ALTER TABLE daily_task_records
    ADD COLUMN all_marked BOOLEAN DEFAULT FALSE;

    RAISE NOTICE '✅ all_marked 字段已添加';
  END IF;
END $$;

COMMENT ON COLUMN daily_task_records.all_marked IS
'是否全部标记过（任何状态）- 两阶段系统的完成标志';

-- ----------------------------------------------------------------------------
-- 步骤 3: 创建新数据库函数（两阶段系统专用）
-- ----------------------------------------------------------------------------

-- 3.1 函数：获取完全未标记的单词（新逻辑）
CREATE OR REPLACE FUNCTION get_unmarked_words(
  p_user_id UUID,
  p_book_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  id UUID,
  word TEXT,
  phonetic VARCHAR(255),
  definition VARCHAR(255),
  example_sentence TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.word, w.phonetic, w.definition, w.example_sentence
  FROM words w
  WHERE w.book_id = p_book_id
    AND NOT EXISTS (
      -- [Upgrade] 两阶段系统：查询完全未标记的词（word_progress 表中没有记录）
      SELECT 1 FROM word_progress wp
      WHERE wp.word_id = w.id
        AND wp.user_id = p_user_id
    )
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_unmarked_words IS
'获取完全未标记的单词（两阶段系统 - 新功能）';

-- 3.2 保留旧函数：获取 status != 'known' 的单词（向后兼容）
CREATE OR REPLACE FUNCTION get_words_not_known(
  p_user_id UUID,
  p_book_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  id UUID,
  word TEXT,
  phonetic VARCHAR(255),
  definition VARCHAR(255),
  example_sentence TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.word, w.phonetic, w.definition, w.example_sentence
  FROM words w
  WHERE w.book_id = p_book_id
    AND NOT EXISTS (
      -- [Legacy] v4.0 逻辑：只查询 status != 'known' 的词
      SELECT 1 FROM word_progress wp
      WHERE wp.word_id = w.id
        AND wp.user_id = p_user_id
        AND wp.status = 'known'
    )
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_words_not_known IS
'获取 status != known 的单词（v4.0 逻辑 - 向后兼容）';

-- 3.3 函数：检测学习阶段是否完成（所有词都标记过）
CREATE OR REPLACE FUNCTION check_learning_phase_completion(
  p_user_id UUID,
  p_book_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_total_words INTEGER;
  v_marked_words INTEGER;
BEGIN
  -- 统计单词书总词数
  SELECT COUNT(*) INTO v_total_words
  FROM words
  WHERE book_id = p_book_id;

  -- [Upgrade] 两阶段系统：统计已标记的词数（任何状态）
  SELECT COUNT(DISTINCT word_id) INTO v_marked_words
  FROM word_progress
  WHERE user_id = p_user_id
    AND book_id = p_book_id;

  -- 如果所有词都标记过，返回 TRUE
  RETURN v_marked_words >= v_total_words;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_learning_phase_completion IS
'检测学习阶段是否完成（两阶段系统：所有词都标记过）';

-- 3.4 函数：自动切换到复习阶段
CREATE OR REPLACE FUNCTION transition_to_review_phase(
  p_user_id UUID,
  p_book_id UUID
) RETURNS VOID AS $$
BEGIN
  -- [Upgrade] 两阶段系统：更新学习计划状态
  UPDATE learning_plans
  SET phase = 'review',
      learning_phase_completed_at = NOW(),
      review_phase_started_at = NOW(),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND phase = 'learning';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION transition_to_review_phase IS
'自动切换学习计划到复习阶段（两阶段系统）';

-- 3.5 函数：获取今日需复习的词（包含所有标记状态）
CREATE OR REPLACE FUNCTION get_due_review_words_all(
  p_user_id UUID,
  p_book_id UUID,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  word_id UUID,
  review_count INTEGER,
  next_review_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT rs.word_id, rs.review_count, rs.next_review_date
  FROM review_schedule rs
  WHERE rs.user_id = p_user_id
    AND rs.book_id = p_book_id
    AND rs.next_review_date <= CURRENT_DATE
  ORDER BY rs.next_review_date ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_due_review_words_all IS
'获取今日需复习的词（两阶段系统：包含所有标记状态）';

-- ----------------------------------------------------------------------------
-- 步骤 4: 扩展 get_learning_plan_progress 函数（保持向后兼容）
-- ----------------------------------------------------------------------------

-- 4.1 删除旧函数（如果存在）
DROP FUNCTION IF EXISTS get_learning_plan_progress(p_user_id UUID, p_book_id UUID);

-- 4.2 创建新函数（同时返回新旧统计）
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

-- ----------------------------------------------------------------------------
-- 步骤 5: 创建索引（优化查询性能）
-- ----------------------------------------------------------------------------

-- 5.1 优化：查询完全未标记的词
CREATE INDEX IF NOT EXISTS idx_words_book_id
ON words(book_id, id);

-- 5.2 优化：查询学习阶段状态
CREATE INDEX IF NOT EXISTS idx_learning_plans_phase
ON learning_plans(user_id, phase)
WHERE phase IN ('learning', 'review');

-- 5.3 优化：查询复习阶段状态
CREATE INDEX IF NOT EXISTS idx_learning_plans_user_phase
ON learning_plans(user_id, status, phase);

-- ----------------------------------------------------------------------------
-- 步骤 6: 授权（允许认证用户调用新函数）
-- ----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION get_unmarked_words TO authenticated;
GRANT EXECUTE ON FUNCTION get_words_not_known TO authenticated;
GRANT EXECUTE ON FUNCTION check_learning_phase_completion TO authenticated;
GRANT EXECUTE ON FUNCTION transition_to_review_phase TO authenticated;
GRANT EXECUTE ON FUNCTION get_due_review_words_all TO authenticated;

-- ----------------------------------------------------------------------------
-- 步骤 7: 验证迁移
-- ----------------------------------------------------------------------------

-- 7.1 验证表结构
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'learning_plans'
  AND column_name IN ('phase', 'learning_phase_completed_at', 'review_phase_started_at')
ORDER BY ordinal_position;

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_task_records'
  AND column_name IN ('marked_words', 'known_words', 'fuzzy_words', 'unknown_words', 'all_marked')
ORDER BY ordinal_position;

-- 7.2 验证函数
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_unmarked_words',
    'get_words_not_known',
    'check_learning_phase_completion',
    'transition_to_review_phase',
    'get_due_review_words_all'
  );

-- ============================================================================
-- 迁移完成
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '两阶段学习系统升级完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 新增字段: phase, learning_phase_completed_at, review_phase_started_at';
  RAISE NOTICE '✅ 新增字段: marked_words, known_words, fuzzy_words, unknown_words, all_marked';
  RAISE NOTICE '✅ 新增函数: 5 个（保持向后兼容）';
  RAISE NOTICE '✅ 新增索引: 3 个';
  RAISE NOTICE '';
  RAISE NOTICE '系统启用:';
  RAISE NOTICE '✅ 默认阶段: learning（两阶段系统）';
  RAISE NOTICE '✅ 自动迁移: 所有现有计划 → learning';
  RAISE NOTICE '✅ 新词定义: 完全未标记（无 word_progress 记录）';
  RAISE NOTICE '';
  RAISE NOTICE '向后兼容性:';
  RAISE NOTICE '✅ 旧字段保留: learned_words, progress_percentage';
  RAISE NOTICE '✅ 旧函数保留: get_words_not_known（Legacy 策略）';
  RAISE NOTICE '✅ 旧逻辑保留: 通过 Strategy 模式隔离';
  RAISE NOTICE '';
  RAISE NOTICE '下一步:';
  RAISE NOTICE '1. 更新 TypeScript 类型定义';
  RAISE NOTICE '2. 更新后端逻辑（Strategy 模式）';
  RAISE NOTICE '3. 更新前端组件（渐进式升级）';
  RAISE NOTICE '4. 通过 Feature Flag 控制灰度发布';
  RAISE NOTICE '========================================';
END
$$;
