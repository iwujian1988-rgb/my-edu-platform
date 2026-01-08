-- ============================================
-- 权限系统迁移 - 完整SQL脚本
-- 版本: v1.0
-- 创建日期: 2026-01-07
-- 说明: 在Supabase Dashboard的SQL Editor中执行此脚本
-- ============================================

-- ============================================
-- 第一部分：创建 invitation_packages 表
-- ============================================

-- 创建套餐表
CREATE TABLE IF NOT EXISTS invitation_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  validity_days INTEGER,
  feature_permissions TEXT[] DEFAULT '{}',
  book_permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE invitation_packages IS '邀请码套餐表 - 管理权限套餐';
COMMENT ON COLUMN invitation_packages.id IS '套餐ID';
COMMENT ON COLUMN invitation_packages.name IS '套餐名称，如"1年基础版"';
COMMENT ON COLUMN invitation_packages.description IS '套餐描述';
COMMENT ON COLUMN invitation_packages.validity_days IS '有效期天数，NULL表示永久有效';
COMMENT ON COLUMN invitation_packages.feature_permissions IS '功能权限数组';
COMMENT ON COLUMN invitation_packages.book_permissions IS '单词书权限数组，如["*"]表示全部';
COMMENT ON COLUMN invitation_packages.is_active IS '是否启用';
COMMENT ON COLUMN invitation_packages.sort_order IS '排序顺序';

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_invitation_packages_is_active ON invitation_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_invitation_packages_sort_order ON invitation_packages(sort_order);

-- 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_invitation_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invitation_packages_updated_at ON invitation_packages;
CREATE TRIGGER trigger_update_invitation_packages_updated_at
  BEFORE UPDATE ON invitation_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_packages_updated_at();

-- 启用 RLS
ALTER TABLE invitation_packages ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
DROP POLICY IF EXISTS "管理员可以查看所有套餐" ON invitation_packages;
CREATE POLICY "管理员可以查看所有套餐" ON invitation_packages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.is_active = true));

DROP POLICY IF EXISTS "管理员可以插入套餐" ON invitation_packages;
CREATE POLICY "管理员可以插入套餐" ON invitation_packages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.is_active = true));

DROP POLICY IF EXISTS "管理员可以更新套餐" ON invitation_packages;
CREATE POLICY "管理员可以更新套餐" ON invitation_packages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.is_active = true));

DROP POLICY IF EXISTS "管理员可以删除套餐" ON invitation_packages;
CREATE POLICY "管理员可以删除套餐" ON invitation_packages
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.is_active = true));

-- 插入示例套餐
INSERT INTO invitation_packages (name, description, validity_days, feature_permissions, book_permissions, is_active, sort_order) VALUES
  ('1年基础版', '基础功能套餐，包含核心学习功能', 365,
   ARRAY['match_game', 'flashcard'],
   ARRAY['cet4', 'high_school_3500'],
   true, 1),
  ('1年进阶版', '进阶功能套餐，包含更多学习模式', 365,
   ARRAY['match_game', 'flashcard', 'dictation', 'custom_book'],
   ARRAY['cet4', 'cet6', 'toefl', 'ielts', 'high_school_3500'],
   true, 2),
  ('永久高级版', '永久有效的高级套餐，包含所有功能', NULL,
   ARRAY['match_game', 'flashcard', 'dictation', 'custom_book', 'review_mode'],
   ARRAY['*'],
   true, 3)
ON CONFLICT DO NOTHING;

-- ============================================
-- 第二部分：为 users 表添加权限字段
-- ============================================

-- 添加权限相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS feature_permissions TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS book_permissions TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permission_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_code_id UUID REFERENCES invitation_codes(id) ON DELETE SET NULL;

-- 添加注释
COMMENT ON COLUMN users.feature_permissions IS '功能权限数组';
COMMENT ON COLUMN users.book_permissions IS '单词书权限数组';
COMMENT ON COLUMN users.permission_expires_at IS '权限到期时间，NULL表示永久有效';
COMMENT ON COLUMN users.invitation_code_id IS '注册时使用的邀请码ID';

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_users_permission_expires_at ON users(permission_expires_at);
CREATE INDEX IF NOT EXISTS idx_users_invitation_code_id ON users(invitation_code_id);

-- 创建权限状态检查函数
CREATE OR REPLACE FUNCTION get_user_permission_status(user_id UUID)
RETURNS TABLE(has_valid_permissions BOOLEAN, is_expired BOOLEAN, days_until_expiry INTEGER) AS $$
DECLARE
  expires_at TIMESTAMPTZ;
BEGIN
  SELECT permission_expires_at INTO expires_at FROM users WHERE id = user_id;
  IF expires_at IS NULL THEN
    RETURN QUERY SELECT true, false, NULL::INTEGER;
  ELSE
    RETURN QUERY SELECT true, expires_at < NOW(), EXTRACT(DAY FROM expires_at - NOW())::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 第三部分：更新 invitation_codes 表
-- ============================================

-- 添加新字段
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES invitation_packages(id) ON DELETE SET NULL;
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS feature_permissions TEXT[] DEFAULT '{}';
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS book_permissions TEXT[] DEFAULT '{}';
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS validity_days INTEGER;
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS used_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS is_exported BOOLEAN DEFAULT false;
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS exported_at TIMESTAMPTZ;

-- 添加 description 字段（如果不存在）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitation_codes' AND column_name = 'description') THEN
    ALTER TABLE invitation_codes ADD COLUMN description TEXT;
  END IF;
END $$;

-- 添加注释
COMMENT ON COLUMN invitation_codes.package_id IS '关联的套餐ID';
COMMENT ON COLUMN invitation_codes.feature_permissions IS '功能权限快照（从套餐复制）';
COMMENT ON COLUMN invitation_codes.book_permissions IS '单词书权限快照（从套餐复制）';
COMMENT ON COLUMN invitation_codes.validity_days IS '有效期天数';
COMMENT ON COLUMN invitation_codes.used_by IS '使用该邀请码的用户ID';
COMMENT ON COLUMN invitation_codes.used_at IS '使用时间';
COMMENT ON COLUMN invitation_codes.is_exported IS '是否已导出';
COMMENT ON COLUMN invitation_codes.exported_at IS '导出时间';

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_invitation_codes_package_id ON invitation_codes(package_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_used_by ON invitation_codes(used_by);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_is_exported ON invitation_codes(is_exported);

-- 创建使用邀请码函数
CREATE OR REPLACE FUNCTION use_invitation_code(code_param TEXT, user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_code RECORD;
BEGIN
  SELECT * INTO invitation_code FROM invitation_codes
  WHERE code = code_param AND is_active = true AND used_by IS NULL
  AND (expires_at IS NULL OR expires_at > NOW())
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE invitation_codes SET used_by = user_id_param, used_at = NOW(), used_count = used_count + 1 WHERE id = invitation_code.id;

  UPDATE users SET
    feature_permissions = invitation_code.feature_permissions,
    book_permissions = invitation_code.book_permissions,
    invitation_code_id = invitation_code.id,
    permission_expires_at = CASE WHEN invitation_code.validity_days IS NOT NULL THEN NOW() + (invitation_code.validity_days || ' days')::INTERVAL ELSE NULL END
  WHERE id = user_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 第四部分：创建 user_permission_logs 表
-- ============================================

-- 创建权限变更日志表
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

-- 添加注释
COMMENT ON TABLE user_permission_logs IS '用户权限变更日志表';
COMMENT ON COLUMN user_permission_logs.change_type IS '变更类型：registration/upgrade/downgrade/adjustment/expiry';

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_user_permission_logs_user_id ON user_permission_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_logs_admin_id ON user_permission_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_logs_change_type ON user_permission_logs(change_type);
CREATE INDEX IF NOT EXISTS idx_user_permission_logs_created_at ON user_permission_logs(created_at DESC);

-- 启用 RLS
ALTER TABLE user_permission_logs ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
DROP POLICY IF EXISTS "用户可以查看自己的权限日志" ON user_permission_logs;
CREATE POLICY "用户可以查看自己的权限日志" ON user_permission_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "管理员可以查看所有权限日志" ON user_permission_logs;
CREATE POLICY "管理员可以查看所有权限日志" ON user_permission_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM administrators WHERE administrators.user_id = auth.uid() AND administrators.is_active = true));

-- 创建权限变更日志函数
CREATE OR REPLACE FUNCTION log_permission_change(
  user_id_param UUID, admin_id_param UUID,
  old_feature_permissions_param TEXT[], old_book_permissions_param TEXT[], old_permission_expires_at_param TIMESTAMPTZ,
  new_feature_permissions_param TEXT[], new_book_permissions_param TEXT[], new_permission_expires_at_param TIMESTAMPTZ,
  change_reason_param TEXT, change_type_param TEXT
) RETURNS UUID AS $$
DECLARE log_id UUID;
BEGIN
  INSERT INTO user_permission_logs (
    user_id, admin_id, old_feature_permissions, old_book_permissions, old_permission_expires_at,
    new_feature_permissions, new_book_permissions, new_permission_expires_at, change_reason, change_type
  ) VALUES (
    user_id_param, admin_id_param, old_feature_permissions_param, old_book_permissions_param, old_permission_expires_at_param,
    new_feature_permissions_param, new_book_permissions_param, new_permission_expires_at_param, change_reason_param, change_type_param
  ) RETURNING id INTO log_id;
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 创建权限变更自动记录触发器
CREATE OR REPLACE FUNCTION trigger_log_permission_change() RETURNS TRIGGER AS $$
DECLARE old_feature TEXT[]; old_book TEXT[]; old_expires TIMESTAMPTZ; new_feature TEXT[]; new_book TEXT[]; new_expires TIMESTAMPTZ; change_type TEXT; admin_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    old_feature := OLD.feature_permissions; old_book := OLD.book_permissions; old_expires := OLD.permission_expires_at;
    new_feature := NEW.feature_permissions; new_book := NEW.book_permissions; new_expires := NEW.permission_expires_at;

    IF array_length(new_feature, 1) > array_length(old_feature, 1) OR array_length(new_book, 1) > array_length(old_book, 1) OR (new_expires IS NULL AND old_expires IS NOT NULL) OR (new_expires > old_expires) THEN
      change_type := 'upgrade';
    ELSIF array_length(new_feature, 1) < array_length(old_feature, 1) OR array_length(new_book, 1) < array_length(old_book, 1) OR (old_expires IS NULL AND new_expires IS NOT NULL) OR (new_expires < old_expires) THEN
      change_type := 'downgrade';
    ELSE change_type := 'adjustment'; END IF;

    IF old_feature IS DISTINCT FROM new_feature OR old_book IS DISTINCT FROM new_book OR old_expires IS DISTINCT FROM new_expires THEN
      admin_id := NULL;
      INSERT INTO user_permission_logs (user_id, admin_id, old_feature_permissions, old_book_permissions, old_permission_expires_at, new_feature_permissions, new_book_permissions, new_permission_expires_at, change_reason, change_type)
      VALUES (NEW.id, admin_id, old_feature, old_book, old_expires, new_feature, new_book, new_expires, '自动记录', change_type);
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.feature_permissions IS NOT NULL THEN
    INSERT INTO user_permission_logs (user_id, admin_id, old_feature_permissions, old_book_permissions, old_permission_expires_at, new_feature_permissions, new_book_permissions, new_permission_expires_at, change_reason, change_type)
    VALUES (NEW.id, NULL, '{}', '{}', NULL, NEW.feature_permissions, NEW.book_permissions, NEW.permission_expires_at, '用户注册', 'registration');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_user_permission_change ON users;
CREATE TRIGGER trigger_log_user_permission_change
  AFTER INSERT OR UPDATE OF feature_permissions, book_permissions, permission_expires_at
  ON users FOR EACH ROW EXECUTE FUNCTION trigger_log_permission_change();

-- 创建权限历史视图
CREATE OR REPLACE VIEW user_permission_history AS
SELECT
  upl.id, upl.user_id, u.phone_number, upl.admin_id, a.name as admin_name,
  upl.old_feature_permissions, upl.old_book_permissions, upl.old_permission_expires_at,
  upl.new_feature_permissions, upl.new_book_permissions, upl.new_permission_expires_at,
  upl.change_reason, upl.change_type, upl.created_at,
  array_length(upl.new_feature_permissions, 1) - array_length(upl.old_feature_permissions, 1) as feature_count_change,
  array_length(upl.new_book_permissions, 1) - array_length(upl.old_book_permissions, 1) as book_count_change
FROM user_permission_logs upl
LEFT JOIN users u ON upl.user_id = u.id
LEFT JOIN administrators a ON upl.admin_id = a.id
ORDER BY upl.created_at DESC;

-- ============================================
-- 验证查询
-- ============================================

-- 查看所有套餐
SELECT * FROM invitation_packages ORDER BY sort_order;

-- 查看新增的users表字段
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('feature_permissions', 'book_permissions', 'permission_expires_at', 'invitation_code_id');

-- 查看新增的invitation_codes表字段
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'invitation_codes' AND column_name IN ('package_id', 'feature_permissions', 'book_permissions', 'validity_days', 'used_by', 'is_exported');

-- 查看user_permission_logs表
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_permission_logs';

-- ============================================
-- 执行完成
-- ============================================

-- 迁移成功完成！
-- 已创建表：
-- 1. invitation_packages (套餐表)
-- 2. user_permission_logs (权限变更日志表)
--
-- 已修改表：
-- 1. users (添加权限字段)
-- 2. invitation_codes (添加套餐关联和权限快照字段)
--
-- 已创建函数：
-- 1. get_user_permission_status() - 检查用户权限状态
-- 2. use_invitation_code() - 使用邀请码
-- 3. log_permission_change() - 记录权限变更
-- 4. trigger_log_permission_change() - 自动记录触发器
