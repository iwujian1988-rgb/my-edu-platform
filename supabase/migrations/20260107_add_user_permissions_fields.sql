-- ============================================
-- 为 users 表添加权限字段
-- 版本: v1.0
-- 创建日期: 2026-01-07
-- 说明: 添加功能权限、单词书权限和权限到期时间字段
-- ============================================

-- 步骤 1: 添加权限相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS feature_permissions TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS book_permissions TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permission_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_code_id UUID REFERENCES invitation_codes(id) ON DELETE SET NULL;

-- 步骤 2: 添加注释
COMMENT ON COLUMN users.feature_permissions IS '功能权限数组，如["match_game", "flashcard"]';
COMMENT ON COLUMN users.book_permissions IS '单词书权限数组，如["cet4", "toefl"]或["*"]表示全部';
COMMENT ON COLUMN users.permission_expires_at IS '权限到期时间，NULL表示永久有效';
COMMENT ON COLUMN users.invitation_code_id IS '注册时使用的邀请码ID';

-- 步骤 3: 添加索引（优化查询性能）
CREATE INDEX IF NOT EXISTS idx_users_permission_expires_at ON users(permission_expires_at);
CREATE INDEX IF NOT EXISTS idx_users_invitation_code_id ON users(invitation_code_id);

-- ============================================
-- 数据迁移说明
-- ============================================

-- 现有用户默认权限处理：
-- 如果需要给现有用户分配默认权限，可以执行以下更新：

-- 示例：为现有用户分配基础权限（有效期30天）
-- UPDATE users
-- SET
--   feature_permissions = ARRAY['match_game', 'flashcard'],
--   book_permissions = ARRAY['cet4', 'high_school_3500'],
--   permission_expires_at = NOW() + INTERVAL '30 days'
-- WHERE feature_permissions = '{}'
-- AND created_at < '2026-01-07';

-- ============================================
-- 函数：检查用户权限是否过期
-- ============================================

CREATE OR REPLACE FUNCTION check_user_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果权限已过期，清空权限数组
  IF NEW.permission_expires_at IS NOT NULL AND NEW.permission_expires_at < NOW() THEN
    NEW.feature_permissions = '{}';
    NEW.book_permissions = '{}';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器（每次查询用户时检查）
-- 注意：这个触发器可能会影响性能，根据实际需求决定是否启用
-- CREATE TRIGGER trigger_check_user_permissions
--   BEFORE UPDATE ON users
--   FOR EACH ROW
--   EXECUTE FUNCTION check_user_permissions();

-- ============================================
-- 函数：获取用户权限状态
-- ============================================

CREATE OR REPLACE FUNCTION get_user_permission_status(user_id UUID)
RETURNS TABLE(
  has_valid_permissions BOOLEAN,
  is_expired BOOLEAN,
  days_until_expiry INTEGER
) AS $$
DECLARE
  expires_at TIMESTAMPTZ;
BEGIN
  SELECT permission_expires_at INTO expires_at
  FROM users
  WHERE id = user_id;

  -- 如果没有设置过期时间，表示永久有效
  IF expires_at IS NULL THEN
    RETURN QUERY SELECT true, false, NULL::INTEGER;
  ELSE
    RETURN QUERY SELECT
      true,
      expires_at < NOW(),
      EXTRACT(DAY FROM expires_at - NOW())::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS 策略更新
-- ============================================

-- 用户只能查看自己的权限信息
CREATE POLICY "用户可以查看自己的权限" ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ============================================
-- 验证脚本
-- ============================================

-- 检查字段是否添加成功:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- AND column_name IN ('feature_permissions', 'book_permissions', 'permission_expires_at', 'invitation_code_id')
-- ORDER BY ordinal_position;

-- 查看用户权限状态:
-- SELECT
--   id,
--   phone_number,
--   feature_permissions,
--   book_permissions,
--   permission_expires_at,
--   (permission_expires_at IS NULL OR permission_expires_at > NOW()) as is_valid
-- FROM users
-- ORDER BY created_at DESC;

-- 测试权限状态函数:
-- SELECT * FROM get_user_permission_status('<user_id>');

-- ============================================
-- 应用层使用说明
-- ============================================

-- 1. 注册时：根据邀请码的权限快照设置用户的权限字段
-- 2. 登录时：检查 permission_expires_at 是否过期
-- 3. 权限验证：在访问功能前检查 feature_permissions 和 book_permissions
-- 4. 权限升级：管理员可以修改用户的权限字段，并记录到 user_permission_logs 表
