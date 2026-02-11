/**
 * 演说家模块 - 添加到权限系统
 *
 * 将 'speaker' 权限添加到所有 invitation_packages 的 feature_permissions 数组
 */

-- ========================================
-- 1. 为所有现有套餐添加 'speaker' 权限
-- ========================================

UPDATE invitation_packages
SET feature_permissions = array_append(feature_permissions, 'speaker')
WHERE 'speaker' != ANY(feature_permissions);

-- ========================================
-- 2. 验证更新结果
-- ========================================

DO $$
DECLARE
  package_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO package_count
  FROM invitation_packages
  WHERE 'speaker' = ANY(feature_permissions);

  RAISE NOTICE '✅ 演说家权限已添加到 % 个套餐', package_count;
  RAISE NOTICE '现在后台管理系统的套餐配置中会显示"演说家"权限选项';
END $$;

-- ========================================
-- 3. 显示更新后的套餐列表（用于调试）
-- ========================================

-- 取消注释以下查询以查看所有套餐的权限状态
/*
SELECT
  id,
  name,
  feature_permissions
FROM invitation_packages
ORDER BY created_at;
*/
