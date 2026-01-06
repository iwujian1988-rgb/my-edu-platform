-- ============================================
-- 管理员表创建
-- 版本: v1.0
-- 创建日期: 2026-01-06
-- 说明: 为管理后台创建管理员表，支持 RBAC 权限系统
-- ============================================

-- 创建 administrators 表
CREATE TABLE IF NOT EXISTS administrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'content_admin', 'support')),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE administrators IS '管理员表 - 用于管理后台用户认证和权限管理';
COMMENT ON COLUMN administrators.id IS '管理员ID';
COMMENT ON COLUMN administrators.user_id IS '关联的Supabase Auth用户ID';
COMMENT ON COLUMN administrators.role IS '角色：super_admin(超级管理员) | content_admin(内容管理员) | support(客服)';
COMMENT ON COLUMN administrators.name IS '管理员姓名';
COMMENT ON COLUMN administrators.email IS '管理员邮箱（用于登录）';
COMMENT ON COLUMN administrators.is_active IS '是否启用';
COMMENT ON COLUMN administrators.last_login_at IS '最后登录时间';
COMMENT ON COLUMN administrators.created_at IS '创建时间';
COMMENT ON COLUMN administrators.updated_at IS '更新时间';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_administrators_user_id ON administrators(user_id);
CREATE INDEX IF NOT EXISTS idx_administrators_email ON administrators(email);
CREATE INDEX IF NOT EXISTS idx_administrators_role ON administrators(role);
CREATE INDEX IF NOT EXISTS idx_administrators_is_active ON administrators(is_active);

-- 创建触发器：自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_administrators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_administrators_updated_at
  BEFORE UPDATE ON administrators
  FOR EACH ROW
  EXECUTE FUNCTION update_administrators_updated_at();

-- ============================================
-- 初始数据：创建超级管理员账户
-- ============================================

-- 注意：这个脚本会在 Supabase 项目中创建初始管理员
-- 默认凭证：
--   邮箱: admin@xiaoyu.com
--   密码: 需要通过 Supabase Auth UI 或 API 设置

-- 插入超级管理员记录（假设 auth.users 中已存在用户）
-- 注意：user_id 需要替换为实际的 auth.users.id
-- 这里先创建一个待关联的记录，user_id 暂时为 NULL
INSERT INTO administrators (role, name, email, is_active)
VALUES ('super_admin', '超级管理员', 'admin@xiaoyu.com', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 权限说明
-- ============================================

-- super_admin (超级管理员):
--   - 所有权限
--   - 管理员账号管理
--   - 系统设置修改

-- content_admin (内容管理员):
--   - 词库管理（查看、创建、编辑、删除、导入）
--   - 用户词库审核
--   - 邀请码创建和查看
--   - 数据统计查看

-- support (客服人员):
--   - 用户查看和封禁
--   - 邀请码查看
--   - 数据统计查看
--   - 操作日志查看
