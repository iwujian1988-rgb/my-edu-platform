-- 邀请码使用记录表
-- 记录每个用户使用哪个邀请码注册，以及使用时间和IP地址

CREATE TABLE IF NOT EXISTS invitation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_code_id UUID NOT NULL REFERENCES invitation_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_invitation_usage_code_id ON invitation_usage(invitation_code_id);
CREATE INDEX IF NOT EXISTS idx_invitation_usage_user_id ON invitation_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_invitation_usage_used_at ON invitation_usage(used_at);

-- 添加注释
COMMENT ON TABLE invitation_usage IS '记录每个用户使用邀请码注册的详细信息';
COMMENT ON COLUMN invitation_usage.invitation_code_id IS '使用的邀请码ID';
COMMENT ON COLUMN invitation_usage.user_id IS '注册的用户ID';
COMMENT ON COLUMN invitation_usage.used_at IS '使用时间';
COMMENT ON COLUMN invitation_usage.ip_address IS '注册时的IP地址';

-- 启用行级安全
ALTER TABLE invitation_usage ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略：所有管理员可以查看邀请码使用记录
CREATE POLICY "Admins can view invitation usage"
  ON invitation_usage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM administrators
      WHERE id = auth.uid()
        AND is_active = true
    )
  );

-- 创建RLS策略：超级管理员可以删除邀请码使用记录
CREATE POLICY "Super admins can delete invitation usage"
  ON invitation_usage
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM administrators
      WHERE id = auth.uid()
        AND role = 'super_admin'
        AND is_active = true
    )
  );
