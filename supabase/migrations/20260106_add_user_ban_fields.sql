-- ============================================
-- 修改 users 表 - 添加用户封禁相关字段
-- 版本: v1.0
-- 创建日期: 2026-01-06
-- 说明: 为用户表添加封禁管理功能，支持永久封禁和临时封禁
-- ============================================

-- 步骤 1: 添加封禁相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_by UUID;  -- 暂时不设置外键，可选项关联 administrators
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMP WITH TIME ZONE;

-- 步骤 2: 添加注释
COMMENT ON COLUMN users.is_banned IS '是否被封禁';
COMMENT ON COLUMN users.banned_at IS '封禁时间';
COMMENT ON COLUMN users.banned_by IS '封禁人ID（管理员）';
COMMENT ON COLUMN users.ban_reason IS '封禁原因';
COMMENT ON COLUMN users.ban_expires_at IS '封禁过期时间（NULL表示永久封禁）';

-- 步骤 3: 添加索引（优化查询性能）
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);
CREATE INDEX IF NOT EXISTS idx_users_banned_at ON users(banned_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_ban_expires_at ON users(ban_expires_at) WHERE ban_expires_at IS NOT NULL;

-- ============================================
-- 字段说明
-- ============================================

-- is_active vs is_banned 的区别:
--
-- is_active (原字段):
--   - 表示账户是否激活
--   - 用于：邮箱验证、手机验证等
--   - false: 账户未激活，无法登录
--   - true: 账户已激活，可以正常使用
--
-- is_banned (新字段):
--   - 表示账户是否被封禁
--   - 用于：违规行为处理、恶意用户管理等
--   - false: 账户正常
--   - true: 账户被封禁，无法登录

-- 登录验证逻辑:
--   1. is_active = true AND is_banned = false  → 允许登录
--   2. is_active = false                      → 提示"账户未激活"
--   3. is_banned = true                       → 提示"账户已被封禁，请联系客服"

-- ============================================
-- 封禁类型
-- ============================================

-- 永久封禁:
--   is_banned = true
--   banned_at = 当前时间
--   banned_by = 管理员ID
--   ban_reason = "违规原因"
--   ban_expires_at = NULL

-- 临时封禁（如7天）:
--   is_banned = true
--   banned_at = 当前时间
--   banned_by = 管理员ID
--   ban_reason = "临时封禁"
--   ban_expires_at = 当前时间 + 7天

-- ============================================
-- 辅助函数
-- ============================================

-- 函数：检查用户是否被封禁
CREATE OR REPLACE FUNCTION is_user_banned(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = user_id
      AND is_banned = true
      AND (ban_expires_at IS NULL OR ban_expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_user_banned IS '检查用户是否处于封禁状态';

-- 函数：自动解封过期封禁（定时任务可调用）
CREATE OR REPLACE FUNCTION auto_unban_users()
RETURNS INTEGER AS $$
DECLARE
  unban_count INTEGER;
BEGIN
  UPDATE users
  SET is_banned = false,
      banned_at = NULL,
      ban_expires_at = NULL,
      ban_reason = NULL
  WHERE is_banned = true
    AND ban_expires_at IS NOT NULL
    AND ban_expires_at <= NOW();

  GET DIAGNOSTICS unban_count = ROW_COUNT;
  RETURN unban_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_unban_users IS '自动解封过期封禁的用户，返回解封数量';

-- ============================================
-- 使用示例
-- ============================================

-- 示例 1: 封禁用户（永久）
-- UPDATE users
-- SET
--   is_banned = true,
--   banned_at = NOW(),
--   banned_by = 'admin-uuid',
--   ban_reason = '恶意刷邀请码',
--   ban_expires_at = NULL
-- WHERE id = 'user-uuid';

-- 示例 2: 封禁用户（临时7天）
-- UPDATE users
-- SET
--   is_banned = true,
--   banned_at = NOW(),
--   banned_by = 'admin-uuid',
--   ban_reason = '临时封禁7天',
--   ban_expires_at = NOW() + INTERVAL '7 days'
-- WHERE id = 'user-uuid';

-- 示例 3: 解封用户
-- UPDATE users
-- SET
--   is_banned = false,
--   banned_at = NULL,
--   ban_expires_at = NULL,
--   ban_reason = NULL
-- WHERE id = 'user-uuid';

-- 示例 4: 查询所有被封禁的用户
-- SELECT id, phone_number, banned_at, ban_reason, ban_expires_at
-- FROM users
-- WHERE is_banned = true
-- ORDER BY banned_at DESC;

-- 示例 5: 查询临时封禁已过期的用户
-- SELECT id, phone_number, ban_expires_at
-- FROM users
-- WHERE is_banned = true
--   AND ban_expires_at IS NOT NULL
--   AND ban_expires_at <= NOW();

-- 示例 6: 执行自动解封
-- SELECT auto_unban_users();

-- ============================================
-- 前端登录验证
-- ============================================

-- 在登录 API 中添加封禁检查:
--
-- SELECT
--   u.id,
--   u.phone_number,
--   u.is_active,
--   u.is_banned,
--   u.ban_reason,
--   u.ban_expires_at
-- FROM users u
-- WHERE u.phone_number = '13800138000';
--
-- 应用层逻辑:
--   if (!user.is_active) {
--     return '账户未激活，请先验证邮箱';
--   }
--   if (user.is_banned) {
--     if (user.ban_expires_at && user.ban_expires_at > new Date()) {
--       return `账户已被临时封禁，解封时间：${user.ban_expires_at}`;
--     } else {
--       return '账户已被永久封禁，请联系客服：support@xiaoyu.com';
--     }
--   }
