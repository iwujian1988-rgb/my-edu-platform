-- ============================================
-- 修改 invitation_codes 表 - 支持管理员创建邀请码
-- 版本: v1.0
-- 创建日期: 2026-01-06
-- 说明: 添加 created_by_admin 字段，支持管理员创建邀请码
-- ============================================

-- 步骤 1: 添加 created_by_admin 字段
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES administrators(id) ON DELETE SET NULL;

-- 步骤 2: 添加注释
COMMENT ON COLUMN invitation_codes.created_by IS '创建人ID（旧字段，保留向后兼容）';
COMMENT ON COLUMN invitation_codes.created_by_admin IS '创建人ID（管理员）- 新字段，用于管理后台';

-- 步骤 3: 添加索引（优化查询性能）
CREATE INDEX IF NOT EXISTS idx_invitation_codes_created_by_admin ON invitation_codes(created_by_admin);

-- ============================================
-- 数据迁移说明
-- ============================================

-- 如果现有 invitation_codes 表中有数据，需要将 created_by 迁移到 created_by_admin
-- 注意：只有当创建者实际上是管理员时才需要迁移

-- 示例迁移脚本（根据实际情况调整）:
-- UPDATE invitation_codes
-- SET created_by_admin = (
--   SELECT id FROM administrators
--   WHERE administrators.email = 'admin@xiaoyu.com'  -- 指定一个默认管理员
-- )
-- WHERE created_by IS NOT NULL AND created_by_admin IS NULL;

-- ============================================
-- 应用层使用说明
-- ============================================

-- 前端用户注册流程:
--   - 仍然使用 invitation_codes.code 验证邀请码
--   - 不需要关心 created_by 或 created_by_admin 字段

-- 管理后台邀请码管理:
--   - 创建邀请码时，设置 created_by_admin = 当前管理员ID
--   - 查询邀请码时，使用 created_by_admin 关联查询管理员信息
--   - 可以通过 created_by_admin IS NULL 判断是否为管理员创建

-- ============================================
-- 兼容性说明
-- ============================================

-- 保留 created_by 字段的原因:
--   1. 向后兼容：避免破坏现有代码
--   2. 灵活性：支持用户邀请用户（未来功能）
--   3. 数据完整性：保留历史数据

-- 新代码使用规范:
--   - 管理后台创建的邀请码：使用 created_by_admin
--   - 用户创建的邀请码（如果有）：使用 created_by
--   - 查询时优先检查 created_by_admin，其次检查 created_by

-- ============================================
-- 视图：统一的邀请码创建人信息
-- ============================================

-- 创建视图，简化查询（可选）
CREATE OR REPLACE VIEW invitation_codes_with_creator AS
SELECT
  ic.*,
  COALESCE(
    jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'email', a.email,
      'role', a.role
    ),
    jsonb_build_object(
      'id', u.id,
      'phone_number', u.phone_number
    )
  ) as creator_info,
  CASE
    WHEN ic.created_by_admin IS NOT NULL THEN 'admin'
    WHEN ic.created_by IS NOT NULL THEN 'user'
    ELSE 'system'
  END as creator_type
FROM invitation_codes ic
LEFT JOIN administrators a ON ic.created_by_admin = a.id
LEFT JOIN users u ON ic.created_by = u.id;

COMMENT ON VIEW invitation_codes_with_creator IS '邀请码视图 - 包含创建人信息';

-- ============================================
-- 验证脚本
-- ============================================

-- 检查字段是否添加成功:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'invitation_codes'
-- ORDER BY ordinal_position;

-- 查看所有邀请码及创建人信息:
-- SELECT code, created_by_admin, created_by, creator_type, creator_info
-- FROM invitation_codes_with_creator
-- ORDER BY created_at DESC;
