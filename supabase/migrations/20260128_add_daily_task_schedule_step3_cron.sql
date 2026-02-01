-- ============================================================================
-- 步骤 3: 创建 pg_cron 定时任务（可选）
-- ============================================================================
-- 如果步骤 1 中 pg_cron 检查通过，执行这个
-- 如果 pg_cron 不可用，可以跳过此步骤，手动调用 trigger_daily_task_generation()
-- ============================================================================

-- 先检查 pg_cron 是否可用
DO $$
DECLARE
  v_cron_available BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO v_cron_available;

  IF NOT v_cron_available THEN
    RAISE EXCEPTION '❌ pg_cron 扩展未安装，请先在 Supabase Dashboard 中启用 pg_cron 扩展';
  END IF;

  RAISE NOTICE '✅ pg_cron 扩展已安装，继续创建定时任务...';
END
$$;

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

-- 创建新的定时任务
DO $$
BEGIN
  PERFORM cron.schedule(
    'generate-daily-tasks'::TEXT,
    '0 0 * * *'::TEXT,
    $$SELECT generate_all_daily_tasks();$$::TEXT
  );

  RAISE NOTICE '✅ 定时任务创建成功: generate-daily-tasks';
  RAISE NOTICE '   执行时间: 每天 00:00 (凌晨)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️  定时任务创建失败: %', SQLERRM;
    RAISE NOTICE '提示：您仍然可以手动调用 SELECT trigger_daily_task_generation();';
END
$$;

-- 查看已创建的定时任务
DO $$
DECLARE
  v_job_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM cron.job
    WHERE jobname = 'generate-daily-tasks'
  ) INTO v_job_exists;

  IF v_job_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '定时任务验证';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 定时任务已成功创建';
    RAISE NOTICE '';
    RAISE NOTICE '查看定时任务详情：';
    RAISE NOTICE '  SELECT * FROM cron.job WHERE jobname = ''generate-daily-tasks'';';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '定时任务未创建';
    RAISE NOTICE '========================================';
    RAISE NOTICE '提示：您可以手动触发任务生成：';
    RAISE NOTICE '  SELECT trigger_daily_task_generation();';
    RAISE NOTICE '========================================';
  END IF;
END
$$;
