-- ============================================================================
-- 步骤 4: 测试核心函数
-- ============================================================================
-- 步骤 2 执行成功后，运行这个来验证函数是否正常工作
-- ============================================================================

-- 测试 1: 手动触发今日任务生成
SELECT trigger_daily_task_generation();

-- 测试 2: 检查是否生成了今日任务
SELECT
  user_id,
  book_id,
  task_date,
  plan_day,
  jsonb_array_length(new_words) AS new_words_count,
  jsonb_array_length(review_words) AS review_words_count,
  total_words,
  created_at
FROM daily_task_records
WHERE task_date = CURRENT_DATE
ORDER BY created_at DESC;

-- 测试 3: 查看活跃的学习计划
SELECT
  id,
  user_id,
  book_id,
  daily_new_words,
  daily_max_words,
  status
FROM learning_plans
WHERE status = 'active';

-- 测试 4: 检查函数是否创建成功
SELECT
  proname AS function_name,
  prosrc AS function_body_preview
FROM pg_proc
WHERE proname IN (
  'generate_all_daily_tasks',
  'generate_daily_task_for_plan',
  'trigger_daily_task_generation',
  'cleanup_old_daily_tasks'
)
ORDER BY proname;
