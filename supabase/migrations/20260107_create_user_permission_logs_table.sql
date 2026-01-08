-- ============================================
-- 创建 user_permission_logs 表 - 用户权限变更日志
-- 版本: v1.0
-- 创建日期: 2026-01-07
-- 说明: 记录用户权限的所有变更历史，包括注册、升级、降权、调整等
-- ============================================

-- 步骤 1: 创建用户权限变更日志表
CREATE TABLE IF NOT EXISTS user_permission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES administrators(id) ON DELETE SET NULL,
  old_feature_permissions TEXT[] DEFAULT '{}',
  old_book_permissions TEXT[] DEFAULT '{}',
  old_permission_expires_at TIMESTAMPTZ,
  new_feature_permissions TEXT[] DEFAULT '{}',
  new_book_permissions TEXT[] DEFAULT '{}',
  new_permission_expires_at TIMESTAMPTZ,
  change_reason TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('registration', 'upgrade', 'downgrade', 'adjustment', 'expiry')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 步骤 2: 添加注释
COMMENT ON TABLE user_permission_logs IS '用户权限变更日志表';
COMMENT ON COLUMN user_permission_logs.id IS '日志ID';
COMMENT ON COLUMN user_permission_logs.user_id IS '用户ID';
COMMENT ON COLUMN user_permission_logs.admin_id IS '操作管理员ID（注册时为NULL）';
COMMENT ON COLUMN user_permission_logs.old_feature_permissions IS '变更前功能权限';
COMMENT ON COLUMN user_permission_logs.old_book_permissions IS '变更前单词书权限';
COMMENT ON COLUMN user_permission_logs.old_permission_expires_at IS '变更前权限到期时间';
COMMENT ON COLUMN user_permission_logs.new_feature_permissions IS '变更后功能权限';
COMMENT ON COLUMN user_permission_logs.new_book_permissions IS '变更后单词书权限';
COMMENT ON COLUMN user_permission_logs.new_permission_expires_at IS '变更后权限到期时间';
COMMENT ON COLUMN user_permission_logs.change_reason IS '变更原因（必填）';
COMMENT ON COLUMN user_permission_logs.change_type IS '变更类型：registration（注册）、upgrade（升级）、downgrade（降权）、adjustment（调整）、expiry（过期）';
COMMENT ON COLUMN user_permission_logs.created_at IS '创建时间';

-- 步骤 3: 添加索引
CREATE INDEX IF NOT EXISTS idx_user_permission_logs_user_id ON user_permission_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_logs_admin_id ON user_permission_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_logs_change_type ON user_permission_logs(change_type);
CREATE INDEX IF NOT EXISTS idx_user_permission_logs_created_at ON user_permission_logs(created_at DESC);

-- 步骤 4: 启用 RLS (行级安全)
ALTER TABLE user_permission_logs ENABLE ROW LEVEL SECURITY;

-- 步骤 5: 创建 RLS 策略
-- 用户可以查看自己的权限变更日志
CREATE POLICY "用户可以查看自己的权限日志" ON user_permission_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 管理员可以查看所有权限变更日志
CREATE POLICY "管理员可以查看所有权限日志" ON user_permission_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.user_id = auth.uid()
      AND administrators.is_active = true
    )
  );

-- ============================================
-- 函数：记录权限变更日志
-- ============================================

CREATE OR REPLACE FUNCTION log_permission_change(
  user_id_param UUID,
  admin_id_param UUID,
  old_feature_permissions_param TEXT[],
  old_book_permissions_param TEXT[],
  old_permission_expires_at_param TIMESTAMPTZ,
  new_feature_permissions_param TEXT[],
  new_book_permissions_param TEXT[],
  new_permission_expires_at_param TIMESTAMPTZ,
  change_reason_param TEXT,
  change_type_param TEXT
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO user_permission_logs (
    user_id,
    admin_id,
    old_feature_permissions,
    old_book_permissions,
    old_permission_expires_at,
    new_feature_permissions,
    new_book_permissions,
    new_permission_expires_at,
    change_reason,
    change_type
  ) VALUES (
    user_id_param,
    admin_id_param,
    old_feature_permissions_param,
    old_book_permissions_param,
    old_permission_expires_at_param,
    new_feature_permissions_param,
    new_book_permissions_param,
    new_permission_expires_at_param,
    change_reason_param,
    change_type_param
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 触发器：自动记录用户权限变更
-- ============================================

CREATE OR REPLACE FUNCTION trigger_log_permission_change()
RETURNS TRIGGER AS $$
DECLARE
  old_feature TEXT[];
  old_book TEXT[];
  old_expires TIMESTAMPTZ;
  new_feature TEXT[];
  new_book TEXT[];
  new_expires TIMESTAMPTZ;
  change_type TEXT;
  admin_id UUID;
BEGIN
  -- 获取旧权限值
  IF TG_OP = 'UPDATE' THEN
    old_feature := OLD.feature_permissions;
    old_book := OLD.book_permissions;
    old_expires := OLD.permission_expires_at;

    new_feature := NEW.feature_permissions;
    new_book := NEW.book_permissions;
    new_expires := NEW.permission_expires_at;

    -- 判断变更类型
    IF array_length(new_feature, 1) > array_length(old_feature, 1) OR
       array_length(new_book, 1) > array_length(old_book, 1) OR
       (new_expires IS NULL AND old_expires IS NOT NULL) OR
       (new_expires > old_expires) THEN
      change_type := 'upgrade';
    ELSIF array_length(new_feature, 1) < array_length(old_feature, 1) OR
           array_length(new_book, 1) < array_length(old_book, 1) OR
           (old_expires IS NULL AND new_expires IS NOT NULL) OR
           (new_expires < old_expires) THEN
      change_type := 'downgrade';
    ELSE
      change_type := 'adjustment';
    END IF;

    -- 检查权限是否真的发生了变化
    IF old_feature IS DISTINCT FROM new_feature OR
       old_book IS DISTINCT FROM new_book OR
       old_expires IS DISTINCT FROM new_expires THEN

      -- 尝试获取当前管理员ID（从会话上下文）
      -- 注意：这里需要应用层传递，暂时设为 NULL
      admin_id := NULL;

      -- 插入日志
      INSERT INTO user_permission_logs (
        user_id,
        admin_id,
        old_feature_permissions,
        old_book_permissions,
        old_permission_expires_at,
        new_feature_permissions,
        new_book_permissions,
        new_permission_expires_at,
        change_reason,
        change_type
      ) VALUES (
        NEW.id,
        admin_id,
        old_feature,
        old_book,
        old_expires,
        new_feature,
        new_book,
        new_expires,
        '自动记录',
        change_type
      );
    END IF;

  ELSIF TG_OP = 'INSERT' AND NEW.feature_permissions IS NOT NULL THEN
    -- 新用户注册时记录
    INSERT INTO user_permission_logs (
      user_id,
      admin_id,
      old_feature_permissions,
      old_book_permissions,
      old_permission_expires_at,
      new_feature_permissions,
      new_book_permissions,
      new_permission_expires_at,
      change_reason,
      change_type
    ) VALUES (
      NEW.id,
      NULL,
      '{}',
      '{}',
      NULL,
      NEW.feature_permissions,
      NEW.book_permissions,
      NEW.permission_expires_at,
      '用户注册',
      'registration'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_log_user_permission_change ON users;
CREATE TRIGGER trigger_log_user_permission_change
  AFTER INSERT OR UPDATE OF feature_permissions, book_permissions, permission_expires_at
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_permission_change();

-- ============================================
-- 视图：用户权限变更历史
-- ============================================

CREATE OR REPLACE VIEW user_permission_history AS
SELECT
  upl.id,
  upl.user_id,
  u.phone_number,
  upl.admin_id,
  a.name as admin_name,
  upl.old_feature_permissions,
  upl.old_book_permissions,
  upl.old_permission_expires_at,
  upl.new_feature_permissions,
  upl.new_book_permissions,
  upl.new_permission_expires_at,
  upl.change_reason,
  upl.change_type,
  upl.created_at,
  -- 计算权限变化
  array_length(upl.new_feature_permissions, 1) - array_length(upl.old_feature_permissions, 1) as feature_count_change,
  array_length(upl.new_book_permissions, 1) - array_length(upl.old_book_permissions, 1) as book_count_change
FROM user_permission_logs upl
LEFT JOIN users u ON upl.user_id = u.id
LEFT JOIN administrators a ON upl.admin_id = a.id
ORDER BY upl.created_at DESC;

COMMENT ON VIEW user_permission_history IS '用户权限变更历史视图';

-- ============================================
-- 验证脚本
-- ============================================

-- 检查表是否创建成功:
-- SELECT table_name, column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'user_permission_logs'
-- ORDER BY ordinal_position;

-- 查看权限变更历史:
-- SELECT * FROM user_permission_history ORDER BY created_at DESC;

-- 查看特定用户的权限变更历史:
-- SELECT * FROM user_permission_history WHERE user_id = '<user_id>' ORDER BY created_at DESC;

-- 测试手动记录日志函数:
-- SELECT log_permission_change(
--   '<user_id>'::UUID,
--   '<admin_id>'::UUID,
--   ARRAY['match_game'],
--   ARRAY['cet4'],
--   NOW() + INTERVAL '30 days',
--   ARRAY['match_game', 'flashcard', 'dictation'],
--   ARRAY['cet4', 'cet6', 'toefl'],
--   NOW() + INTERVAL '365 days',
--   '升级到1年进阶版',
--   'upgrade'
-- );

-- ============================================
-- 应用层使用说明
-- ============================================

-- 1. 触发器自动记录：
--    - users 表的权限字段变更时自动记录
--    - 包括注册、升级、降权等所有变更

-- 2. 手动记录：
--    - 调用 log_permission_change() 函数
--    - 用于管理员手动修改用户权限时

-- 3. 查询权限历史：
--    - 使用 user_permission_history 视图
--    - 可以按用户、管理员、变更类型、时间范围筛选

-- 4. 审计和追溯：
--    - 所有权限变更都有完整记录
--    - 可以追溯用户的权限变化历程
--    - 支持合规性审计
