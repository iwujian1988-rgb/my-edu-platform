-- ============================================
-- 修复视频权限系统 - 添加 package_id 列
-- 版本: v1.1
-- 日期: 2026-03-20
-- 问题: users 表缺少 package_id 列导致视频权限检查失败
-- ============================================

-- ============================================
-- Part 1: 添加 package_id 列（如果不存在）
-- ============================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES invitation_packages(id);

COMMENT ON COLUMN users.package_id IS '用户当前关联的套餐ID';

-- ============================================
-- Part 2: 从 invitation_codes 迁移数据
-- ============================================

-- 将已使用邀请码的套餐关联到用户
UPDATE users u
SET package_id = ic.package_id
FROM invitation_codes ic
WHERE ic.used_by = u.id
  AND ic.package_id IS NOT NULL
  AND u.package_id IS NULL;

-- ============================================
-- Part 3: 创建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_package_id ON users(package_id);

-- ============================================
-- Part 4: 验证迁移结果
-- ============================================

-- 显示迁移后的用户数量
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM users
  WHERE package_id IS NOT NULL;

  RAISE NOTICE '迁移完成: % 个用户已关联套餐', migrated_count;
END $$;

-- ============================================
-- 完成
-- ============================================
