/**
 * 重构用户-套餐关系：支持用户直接关联套餐
 *
 * 目标：
 * 1. users.package_id 直接关联套餐（支持改套餐）
 * 2. invitation_code_id 仅用于注册来源追踪
 * 3. 套餐包含：功能权限 + 语言权限 + 单词书权限
 */

-- ========================================
-- 1. 添加 package_id 字段到 users 表
-- ========================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS package_id UUID;

-- ========================================
-- 2. 添加外键约束
-- ========================================
ALTER TABLE users
ADD CONSTRAINT fk_users_package_id
FOREIGN KEY (package_id)
REFERENCES invitation_packages(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- ========================================
-- 3. 创建索引
-- ========================================
CREATE INDEX IF NOT EXISTS idx_users_package_id
ON users(package_id);

-- ========================================
-- 4. 套餐表新增 language_permissions 字段
-- ========================================
ALTER TABLE invitation_packages
ADD COLUMN IF NOT EXISTS language_permissions TEXT[];

-- ========================================
-- 5. 迁移现有数据
-- ========================================
-- 将现有用户的套餐信息从 invitation_codes 迁移到 package_id
UPDATE users
SET package_id = ic.package_id
FROM invitation_codes ic
WHERE users.invitation_code_id = ic.id
  AND ic.package_id IS NOT NULL;

-- ========================================
-- 6. 添加注释
-- ========================================
COMMENT ON COLUMN users.package_id IS '用户当前套餐ID，可直接修改以升级/降级套餐';
COMMENT ON COLUMN users.invitation_code_id IS '注册时使用的邀请码ID，仅用于来源追踪';
COMMENT ON COLUMN invitation_packages.language_permissions IS '套餐包含的语言包权限，如 ["en", "fr", "es"]';
