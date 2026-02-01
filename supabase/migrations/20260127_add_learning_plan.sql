-- ============================================================================
-- 学习计划系统数据库迁移
-- ============================================================================
-- 版本: v1.0.0
-- 日期: 2026-01-27
-- 作者: 系统架构师
-- 文档: tech-design-learning-plan.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 扩展现有表 word_progress（仅添加字段）
-- ----------------------------------------------------------------------------

-- 添加 next_review_date 字段
ALTER TABLE word_progress
ADD COLUMN IF NOT EXISTS next_review_date DATE;

COMMENT ON COLUMN word_progress.next_review_date IS
'下次复习日期（学习计划系统使用）';

-- 创建索引（优化查询性能）
CREATE INDEX IF NOT EXISTS idx_word_progress_next_review
ON word_progress(user_id, book_id, next_review_date)
WHERE next_review_date IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. 创建学习计划表 learning_plans
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS learning_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,

  -- 学习目标设置
  daily_new_words INTEGER NOT NULL CHECK (daily_new_words > 0 AND daily_new_words <= 100),
  daily_max_words INTEGER NOT NULL CHECK (daily_max_words >= daily_new_words),
  total_words INTEGER NOT NULL,

  -- 时间管理
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  estimated_end_date DATE,
  actual_end_date DATE,

  -- 状态管理
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'delayed')),

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 约束
  UNIQUE(user_id, book_id, status)
);

-- 添加表注释
COMMENT ON TABLE learning_plans IS '学习计划表：用户的学习计划和目标设置';

-- 添加列注释
COMMENT ON COLUMN learning_plans.daily_new_words IS '每天新学单词数量（1-100）';
COMMENT ON COLUMN learning_plans.daily_max_words IS '每天最多学习单词数量（新学+复习）';
COMMENT ON COLUMN learning_plans.total_words IS '单词书总词数';
COMMENT ON COLUMN learning_plans.start_date IS '计划开始日期';
COMMENT ON COLUMN learning_plans.estimated_end_date IS '预计结束日期';
COMMENT ON COLUMN learning_plans.actual_end_date IS '实际完成日期';
COMMENT ON COLUMN learning_plans.status IS '计划状态: active(进行中) | paused(已暂停) | completed(已完成) | delayed(已延迟)';

-- 创建索引
CREATE INDEX idx_learning_plans_user_active
ON learning_plans(user_id, status)
WHERE status = 'active';

CREATE INDEX idx_learning_plans_book_id
ON learning_plans(book_id);

CREATE INDEX idx_learning_plans_created_at
ON learning_plans(created_at DESC);

-- 启用 RLS
ALTER TABLE learning_plans ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看自己的计划
CREATE POLICY "用户只能查看自己的学习计划"
ON learning_plans FOR SELECT
USING (auth.uid() = user_id);

-- RLS 策略：用户可以创建自己的计划
CREATE POLICY "用户可以创建自己的学习计划"
ON learning_plans FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS 策略：用户可以更新自己的计划
CREATE POLICY "用户可以更新自己的学习计划"
ON learning_plans FOR UPDATE
USING (auth.uid() = user_id);

-- RLS 策略：用户可以删除自己的计划
CREATE POLICY "用户可以删除自己的学习计划"
ON learning_plans FOR DELETE
USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. 创建复习计划表 review_schedule
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS review_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,

  -- 复习算法核心字段（基于艾宾浩斯遗忘曲线）
  review_count INTEGER NOT NULL DEFAULT 0
    CHECK (review_count >= 0 AND review_count <= 100),

  next_review_date DATE NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 7
    CHECK (interval_days IN (7, 15, 30)),

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 约束：每个用户每个单词只有一条复习计划
  UNIQUE(user_id, word_id, book_id)
);

-- 添加表注释
COMMENT ON TABLE review_schedule IS '复习计划表：基于艾宾浩斯遗忘曲线的单词复习调度';

-- 添加列注释
COMMENT ON COLUMN review_schedule.review_count IS '连续标记"known"的次数（0/1/2/3+），决定复习间隔';
COMMENT ON COLUMN review_schedule.next_review_date IS '下次应该复习的日期';
COMMENT ON COLUMN review_schedule.interval_days IS '当前复习间隔（天）：7天→15天→30天';

-- 创建索引（查询性能关键）
-- 注意：不能在 WHERE 子句中使用 CURRENT_DATE（STABLE 函数）
-- 解决方案：创建普通索引 + 应用层查询优化
CREATE INDEX idx_review_schedule_next_date
ON review_schedule(user_id, book_id, next_review_date);

CREATE INDEX idx_review_schedule_user_word
ON review_schedule(user_id, word_id);

CREATE INDEX idx_review_schedule_book_id
ON review_schedule(book_id);

-- 启用 RLS
ALTER TABLE review_schedule ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看自己的复习计划
CREATE POLICY "用户只能查看自己的复习计划"
ON review_schedule FOR SELECT
USING (auth.uid() = user_id);

-- RLS 策略：用户可以创建自己的复习计划
CREATE POLICY "用户可以创建自己的复习计划"
ON review_schedule FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS 策略：用户可以更新自己的复习计划
CREATE POLICY "用户可以更新自己的复习计划"
ON review_schedule FOR UPDATE
USING (auth.uid() = user_id);

-- RLS 策略：用户可以删除自己的复习计划
CREATE POLICY "用户可以删除自己的复习计划"
ON review_schedule FOR DELETE
USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. 创建每日任务记录表 daily_task_records
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_task_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,

  -- 任务信息
  task_date DATE NOT NULL,
  plan_day INTEGER NOT NULL CHECK (plan_day > 0),

  -- 单词列表（JSONB 存储）
  new_words JSONB NOT NULL DEFAULT '[]',
  review_words JSONB NOT NULL DEFAULT '[]',
  completed_words JSONB NOT NULL DEFAULT '[]',

  -- 自动计算字段：总词数
  total_words INTEGER NOT NULL GENERATED ALWAYS AS
    (jsonb_array_length(new_words) + jsonb_array_length(review_words)) STORED,

  -- 完成状态
  all_completed BOOLEAN NOT NULL DEFAULT FALSE,

  -- 时间追踪
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 约束
  UNIQUE(user_id, book_id, task_date)
);

-- 添加表注释
COMMENT ON TABLE daily_task_records IS '每日任务记录表：记录用户每天的学习任务和完成情况';

-- 添加列注释
COMMENT ON COLUMN daily_task_records.task_date IS '任务日期';
COMMENT ON COLUMN daily_task_records.plan_day IS '学习计划的第几天（1/2/3...）';
COMMENT ON COLUMN daily_task_records.new_words IS '新学词ID数组（JSONB）: ["uuid1", "uuid2", ...]';
COMMENT ON COLUMN daily_task_records.review_words IS '复习词ID数组（JSONB）';
COMMENT ON COLUMN daily_task_records.completed_words IS '已完成（标记known）的词ID数组（JSONB）';
COMMENT ON COLUMN daily_task_records.total_words IS '总词数（自动计算）';
COMMENT ON COLUMN daily_task_records.all_completed IS '是否全部完成（所有词都标记known）';
COMMENT ON COLUMN daily_task_records.started_at IS '开始学习时间';
COMMENT ON COLUMN daily_task_records.completed_at IS '完成时间（全部完成时记录）';

-- 创建索引
-- 注意：不能在 WHERE 子句中使用 CURRENT_DATE（STABLE 函数）
-- 解决方案：创建普通索引 + 应用层查询优化
CREATE INDEX idx_daily_task_records_date
ON daily_task_records(user_id, book_id, task_date);

CREATE INDEX idx_daily_task_records_plan_id
ON daily_task_records(plan_id);

CREATE INDEX idx_daily_task_records_completed
ON daily_task_records(user_id, all_completed)
WHERE all_completed = TRUE;

CREATE INDEX idx_daily_task_records_user_date
ON daily_task_records(user_id, task_date DESC);

-- 启用 RLS
ALTER TABLE daily_task_records ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看自己的任务记录
CREATE POLICY "用户只能查看自己的任务记录"
ON daily_task_records FOR SELECT
USING (auth.uid() = user_id);

-- RLS 策略：用户可以创建自己的任务记录
CREATE POLICY "用户可以创建自己的任务记录"
ON daily_task_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS 策略：用户可以更新自己的任务记录
CREATE POLICY "用户可以更新自己的任务记录"
ON daily_task_records FOR UPDATE
USING (auth.uid() = user_id);

-- RLS 策略：用户可以删除自己的任务记录
CREATE POLICY "用户可以删除自己的任务记录"
ON daily_task_records FOR DELETE
USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. 创建辅助函数
-- ----------------------------------------------------------------------------

-- 函数：获取今日需要复习的单词数量
CREATE OR REPLACE FUNCTION get_due_review_count(
  p_user_id UUID,
  p_book_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM review_schedule
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND next_review_date <= CURRENT_DATE;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_due_review_count IS
'获取今日需要复习的单词数量（用于生成今日任务）';

-- 函数：检查单词是否在今日任务中
CREATE OR REPLACE FUNCTION is_word_in_today_task(
  p_user_id UUID,
  p_book_id UUID,
  p_word_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_task_record RECORD;
  v_in_new_words BOOLEAN;
  v_in_review_words BOOLEAN;
BEGIN
  -- 查询今日任务记录
  SELECT * INTO v_task_record
  FROM daily_task_records
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND task_date = CURRENT_DATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- 检查是否在 new_words 中
  SELECT EXISTS(
    SELECT 1 FROM jsonb_array_elements_text(v_task_record.new_words) AS word_id
    WHERE word_id = p_word_id::TEXT
  ) INTO v_in_new_words;

  -- 检查是否在 review_words 中
  SELECT EXISTS(
    SELECT 1 FROM jsonb_array_elements_text(v_task_record.review_words) AS word_id
    WHERE word_id = p_word_id::TEXT
  ) INTO v_in_review_words;

  RETURN v_in_new_words OR v_in_review_words;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_word_in_today_task IS
'检查指定单词是否在今日任务中（用于单词列表标记时更新今日任务进度）';

-- 函数：计算学习计划进度
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

  -- 统计已学过的单词数（在 word_progress 中有记录的）
  SELECT COUNT(DISTINCT word_id)
  INTO v_learned_words
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

  RETURN jsonb_build_object(
    'plan_id', v_plan.id,
    'total_words', v_plan.total_words,
    'learned_words', v_learned_words,
    'progress_percentage', ROUND(v_progress, 2),
    'total_tasks', v_total_tasks,
    'completed_tasks', v_completed_tasks,
    'streak_days', v_streak,
    'daily_new_words', v_plan.daily_new_words,
    'daily_max_words', v_plan.daily_max_words
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_learning_plan_progress IS
'计算学习计划的整体进度（已学单词数、进度百分比、连续打卡天数等）';

-- 函数：自动更新 updated_at 字段（触发器函数）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS
'自动更新 updated_at 字段的触发器函数';

-- ----------------------------------------------------------------------------
-- 6. 创建触发器
-- ----------------------------------------------------------------------------

-- learning_plans 表的 updated_at 自动更新
CREATE TRIGGER update_learning_plans_updated_at
  BEFORE UPDATE ON learning_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- review_schedule 表的 updated_at 自动更新
CREATE TRIGGER update_review_schedule_updated_at
  BEFORE UPDATE ON review_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- daily_task_records 表的 updated_at 自动更新
CREATE TRIGGER update_daily_task_records_updated_at
  BEFORE UPDATE ON daily_task_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 7. 授权（允许认证用户调用函数）
-- ----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION get_due_review_count TO authenticated;
GRANT EXECUTE ON FUNCTION is_word_in_today_task TO authenticated;
GRANT EXECUTE ON FUNCTION get_learning_plan_progress TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. 数据完整性检查（可选，用于验证迁移）
-- ----------------------------------------------------------------------------

-- 检查表是否创建成功
DO $$
DECLARE
  v_tables TEXT[];
BEGIN
  SELECT ARRAY(
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('learning_plans', 'review_schedule', 'daily_task_records')
    ORDER BY tablename
  ) INTO v_tables;

  IF ARRAY_LENGTH(v_tables, 1) = 3 THEN
    RAISE NOTICE '✅ 所有表创建成功: %', array_to_string(v_tables, ', ');
  ELSE
    RAISE WARNING '⚠️  表创建不完整，仅创建: %', array_to_string(v_tables, ', ');
  END IF;
END
$$;

-- 检查索引是否创建成功
DO $$
DECLARE
  v_indexes TEXT[];
BEGIN
  SELECT ARRAY(
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (
        indexname LIKE '%learning_plan%' OR
        indexname LIKE '%review_schedule%' OR
        indexname LIKE '%daily_task%' OR
        indexname LIKE '%word_progress_next_review%'
      )
    ORDER BY indexname
  ) INTO v_indexes;

  RAISE NOTICE '✅ 创建了 % 个索引', ARRAY_LENGTH(v_indexes, 1);
END
$$;

-- 检查 RLS 策略是否启用
DO $$
DECLARE
  v_policies TEXT[];
BEGIN
  SELECT ARRAY(
    SELECT policyname || ' ON ' || tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('learning_plans', 'review_schedule', 'daily_task_records')
    ORDER BY tablename, policyname
  ) INTO v_policies;

  RAISE NOTICE '✅ 创建了 % 个 RLS 策略', ARRAY_LENGTH(v_policies, 1);
END
$$;

-- ----------------------------------------------------------------------------
-- 迁移完成
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '学习计划系统数据库迁移完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 扩展表: word_progress';
  RAISE NOTICE '✅ 新建表: learning_plans';
  RAISE NOTICE '✅ 新建表: review_schedule';
  RAISE NOTICE '✅ 新建表: daily_task_records';
  RAISE NOTICE '✅ 辅助函数: 3 个';
  RAISE NOTICE '✅ 触发器: 3 个';
  RAISE NOTICE '✅ RLS 策略: 已启用';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '1. 验证表结构: \d learning_plans';
  RAISE NOTICE '2. 验证数据: SELECT COUNT(*) FROM learning_plans;';
  RAISE NOTICE '3. 测试函数: SELECT get_due_review_count(user_id, book_id);';
  RAISE NOTICE '========================================';
END
$$;
