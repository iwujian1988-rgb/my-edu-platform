-- ============================================================================
-- 启用两阶段学习系统（默认开启）
-- ============================================================================
-- 版本: v1.0
-- 日期: 2026-02-03
-- 说明: 将所有现有学习计划迁移到两阶段系统，新创建的计划默认使用 learning 阶段
-- ============================================================================

-- ------------------------------------------------------------------------------
-- 步骤 1: 更新现有学习计划（legacy → learning）
-- ------------------------------------------------------------------------------

-- 1.1 将所有 NULL 或 'legacy' 阶段的活跃计划更新为 'learning'
DO $$
BEGIN
  -- 更新现有活跃计划
  UPDATE learning_plans
  SET phase = 'learning',
      updated_at = NOW()
  WHERE (phase IS NULL OR phase = 'legacy')
    AND status = 'active';

  RAISE NOTICE '✅ 已将现有活跃学习计划迁移到 learning 阶段';
END $$;

-- ------------------------------------------------------------------------------
-- 步骤 2: 修改字段默认值（新创建计划默认为 learning）
-- ------------------------------------------------------------------------------

-- 2.1 删除旧默认值
DO $$
BEGIN
  -- 检查并删除默认值约束
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'learning_plans'::regclass
      AND attname = 'phase'
      AND attnotnull = false
      AND atthasdef = true
  ) THEN
    EXECUTE 'ALTER TABLE learning_plans ALTER COLUMN phase DROP DEFAULT';
    RAISE NOTICE '✅ 已删除旧的默认值';
  END IF;
END $$;

-- 2.2 设置新默认值为 'learning'
ALTER TABLE learning_plans
ALTER COLUMN phase SET DEFAULT 'learning';

DO $$
BEGIN
  RAISE NOTICE '✅ 新学习计划默认使用 learning 阶段';
END $$;

-- ------------------------------------------------------------------------------
-- 步骤 3: 验证迁移结果
-- ------------------------------------------------------------------------------

-- 3.1 统计各阶段的学习计划数量
SELECT
  phase,
  COUNT(*) as plan_count,
  COUNT(*) FILTER (WHERE status = 'active') as active_count
FROM learning_plans
GROUP BY phase
ORDER BY phase;

-- ------------------------------------------------------------------------------
-- 步骤 4: 添加注释说明
-- ------------------------------------------------------------------------------

COMMENT ON COLUMN learning_plans.phase IS
'学习阶段: learning(学习阶段-默认) | review(复习阶段) | legacy(旧逻辑-已废弃)';

-- ============================================================================
-- 迁移完成
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '两阶段学习系统已默认启用';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 现有计划已迁移到 learning 阶段';
  RAISE NOTICE '✅ 新计划默认使用 learning 阶段';
  RAISE NOTICE '';
  RAISE NOTICE '系统行为变更:';
  RAISE NOTICE '✨ 新词定义: 完全未标记的词（无 word_progress 记录）';
  RAISE NOTICE '✨ 完成定义: 全部标记过（任何状态）';
  RAISE NOTICE '✨ 复习阶段: 自动切换，永不结束';
  RAISE NOTICE '========================================';
END
$$;
