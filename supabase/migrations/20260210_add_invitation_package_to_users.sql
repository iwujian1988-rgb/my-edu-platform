/**
 * 添加 invitation_package 字段到 users 表
 *
 * 这个字段直接存储用户的套餐ID，避免了通过 invitation_codes 表间接查询
 */

-- ========================================
-- 1. 添加 invitation_package 字段
-- ========================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS invitation_package UUID;

-- ========================================
-- 2. 添加外键约束
-- ========================================
ALTER TABLE users
ADD CONSTRAINT fk_users_invitation_package
FOREIGN KEY (invitation_package)
REFERENCES invitation_packages(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- ========================================
-- 3. 创建索引以提高查询性能
-- ========================================
CREATE INDEX IF NOT EXISTS idx_users_invitation_package
ON users(invitation_package);

-- ========================================
-- 4. 迁移现有数据
-- ========================================
-- 将现有用户的套餐信息从 invitation_codes 迁移到 users.invitation_package
UPDATE users
SET invitation_package = ic.package_id
FROM invitation_codes ic
WHERE users.invitation_code_id = ic.id
  AND ic.package_id IS NOT NULL;

-- ========================================
-- 5. 添加注释
-- ========================================
COMMENT ON COLUMN users.invitation_package IS '用户所属套餐ID，直接关联 invitation_packages 表';
