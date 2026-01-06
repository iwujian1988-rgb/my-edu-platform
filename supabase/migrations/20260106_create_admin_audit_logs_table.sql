-- ============================================
-- 管理员操作日志表创建
-- 版本: v1.0
-- 创建日期: 2026-01-06
-- 说明: 记录所有管理员的操作行为，用于审计和安全监控
-- ============================================

-- 创建 admin_audit_logs 表
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES administrators(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE admin_audit_logs IS '管理员操作日志表 - 记录所有管理员的敏感操作';
COMMENT ON COLUMN admin_audit_logs.id IS '日志ID';
COMMENT ON COLUMN admin_audit_logs.admin_id IS '执行操作的管理员ID';
COMMENT ON COLUMN admin_audit_logs.action IS '操作类型（如：create_user, ban_user, delete_book等）';
COMMENT ON COLUMN admin_audit_logs.target_type IS '操作对象类型（如：user, book, invitation_code）';
COMMENT ON COLUMN admin_audit_logs.target_id IS '操作对象ID';
COMMENT ON COLUMN admin_audit_logs.details IS '操作详细信息（JSON格式）';
COMMENT ON COLUMN admin_audit_logs.ip_address IS '操作时的IP地址';
COMMENT ON COLUMN admin_audit_logs.user_agent IS '操作时的浏览器User-Agent';
COMMENT ON COLUMN admin_audit_logs.created_at IS '操作时间';

-- 创建索引（优化查询性能）
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_details ON admin_audit_logs USING GIN(details);

-- ============================================
-- 操作类型定义
-- ============================================

-- 用户管理操作:
--   - create_user: 创建用户
--   - update_user: 更新用户信息
--   - ban_user: 封禁用户
--   - unban_user: 解封用户
--   - reset_password: 重置密码
--   - delete_user: 删除用户

-- 邀请码管理操作:
--   - create_invitation_code: 创建邀请码
--   - batch_create_codes: 批量创建邀请码
--   - disable_invitation_code: 禁用邀请码
--   - delete_invitation_code: 删除邀请码

-- 词库管理操作:
--   - create_book: 创建词库
--   - update_book: 更新词库
--   - delete_book: 删除词库
--   - publish_book: 发布词库
--   - unpublish_book: 下架词库
--   - import_book: Excel导入词库

-- 审核操作:
--   - approve_book: 审核通过词库
--   - reject_book: 审核拒绝词库

-- 系统管理操作:
--   - create_admin: 创建管理员
--   - update_admin: 更新管理员
--   - delete_admin: 删除管理员
--   - update_settings: 修改系统设置

-- ============================================
-- 使用示例
-- ============================================

-- 记录封禁用户操作:
-- INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address)
-- VALUES (
--   'admin-uuid',
--   'ban_user',
--   'user',
--   'user-uuid',
--   '{"reason": "恶意刷邀请码", "duration_days": null}'::jsonb,
--   '192.168.1.1'::inet
-- );

-- 记录创建邀请码操作:
-- INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
-- VALUES (
--   'admin-uuid',
--   'batch_create_codes',
--   'invitation_code',
--   'code-uuid',
--   '{"count": 10, "max_uses": 100, "expires_at": "2026-12-31"}'::jsonb
-- );

-- ============================================
-- 数据保留策略
-- ============================================

-- 建议：保留最近 1 年的操作日志
-- 可以通过以下查询删除旧日志：
-- DELETE FROM admin_audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

-- 或创建定期清理任务（需 Supabase Extensions 支持 pg_cron）
-- SELECT cron.schedule('cleanup-audit-logs', '0 0 * * *', $$DELETE FROM admin_audit_logs WHERE created_at < NOW() - INTERVAL '1 year'$$);
