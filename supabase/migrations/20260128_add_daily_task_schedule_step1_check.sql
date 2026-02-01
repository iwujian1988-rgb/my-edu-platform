-- ============================================================================
-- 步骤 1: 环境检查
-- ============================================================================
-- 先执行这个，确保环境符合要求
-- ============================================================================

-- 检查 1: pg_cron 扩展是否可用
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    )
    THEN '✅ pg_cron 扩展已安装'
    ELSE '❌ pg_cron 扩展未安装 - 需要先启用'
  END AS pg_cron_status;

-- 检查 2: 必需的表是否存在
SELECT
  'learning_plans' AS table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'learning_plans')
    THEN '✅ 存在'
    ELSE '❌ 不存在 - 需要先执行 20260127_add_learning_plan.sql'
  END AS status
UNION ALL
SELECT
  'review_schedule',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_schedule')
    THEN '✅ 存在'
    ELSE '❌ 不存在'
  END
UNION ALL
SELECT
  'daily_task_records',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_task_records')
    THEN '✅ 存在'
    ELSE '❌ 不存在'
  END;

-- 检查 3: cron.schedule 函数是否可用
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'schedule'
    )
    THEN '✅ cron.schedule 函数可用'
    ELSE '❌ cron.schedule 函数不可用'
  END AS cron_function_status;
