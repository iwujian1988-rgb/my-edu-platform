-- ============================================
-- 更新 invitation_codes 表 - 支持套餐化邀请码
-- 版本: v1.0
-- 创建日期: 2026-01-07
-- 说明: 添加套餐关联、权限快照、导出状态等字段
-- ============================================

-- 步骤 1: 添加新字段
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES invitation_packages(id) ON DELETE SET NULL;
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS feature_permissions TEXT[] DEFAULT '{}';
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS book_permissions TEXT[] DEFAULT '{}';
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS validity_days INTEGER;
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS used_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS is_exported BOOLEAN DEFAULT false;
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS exported_at TIMESTAMPTZ;

-- 步骤 2: 添加默认值和约束
-- 确保现有数据的 max_uses 默认为 1（新规范）
UPDATE invitation_codes SET max_uses = 1 WHERE max_uses IS NULL;
ALTER TABLE invitation_codes ALTER COLUMN max_uses SET DEFAULT 1;

-- 如果 description 字段不存在则添加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitation_codes' AND column_name = 'description'
  ) THEN
    ALTER TABLE invitation_codes ADD COLUMN description TEXT;
  END IF;
END $$;

-- 步骤 3: 添加注释
COMMENT ON COLUMN invitation_codes.package_id IS '关联的套餐ID';
COMMENT ON COLUMN invitation_codes.feature_permissions IS '功能权限快照（从套餐复制）';
COMMENT ON COLUMN invitation_codes.book_permissions IS '单词书权限快照（从套餐复制）';
COMMENT ON COLUMN invitation_codes.validity_days IS '有效期天数';
COMMENT ON COLUMN invitation_codes.used_by IS '使用该邀请码的用户ID';
COMMENT ON COLUMN invitation_codes.used_at IS '使用时间';
COMMENT ON COLUMN invitation_codes.is_exported IS '是否已导出';
COMMENT ON COLUMN invitation_codes.exported_at IS '导出时间';
COMMENT ON COLUMN invitation_codes.max_uses IS '最大使用次数（新规范：固定为1）';

-- 步骤 4: 添加索引
CREATE INDEX IF NOT EXISTS idx_invitation_codes_package_id ON invitation_codes(package_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_used_by ON invitation_codes(used_by);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_is_exported ON invitation_codes(is_exported);

-- 步骤 5: 创建唯一约束 - 一个邀请码只能被一个用户使用
-- 注意：这个约束通过 max_uses = 1 和 used_by 唯一性来实现
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitation_codes_used_by_unique
  ON invitation_codes(used_by)
  WHERE used_by IS NOT NULL;

-- ============================================
-- 数据迁移说明
-- ============================================

-- 如果现有 invitation_codes 有数据，需要处理：
-- 1. 设置 max_uses = 1（如果当前不是1）
-- 2. 将现有的 note 字段内容迁移到 description 字段

-- 迁移 note -> description:
-- UPDATE invitation_codes
-- SET description = COALESCE(description, note)
-- WHERE note IS NOT NULL;

-- 设置默认有效期为365天：
-- UPDATE invitation_codes
-- SET validity_days = 365
-- WHERE validity_days IS NULL;

-- 设置默认权限：
-- UPDATE invitation_codes
-- SET
--   feature_permissions = ARRAY['match_game', 'flashcard'],
--   book_permissions = ARRAY['cet4', 'high_school_3500']
-- WHERE feature_permissions = '{}';

-- ============================================
-- 函数：使用邀请码时更新状态
-- ============================================

CREATE OR REPLACE FUNCTION use_invitation_code(code_param TEXT, user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_code RECORD;
  package_validity_days INTEGER;
BEGIN
  -- 查找邀请码
  SELECT * INTO invitation_code
  FROM invitation_codes
  WHERE code = code_param
  AND is_active = true
  AND used_by IS NULL
  AND (expires_at IS NULL OR expires_at > NOW())
  FOR UPDATE;

  -- 如果邀请码不存在或已使用
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 标记邀请码为已使用
  UPDATE invitation_codes
  SET
    used_by = user_id_param,
    used_at = NOW(),
    used_count = used_count + 1
  WHERE id = invitation_code.id;

  -- 更新用户权限
  UPDATE users
  SET
    feature_permissions = invitation_code.feature_permissions,
    book_permissions = invitation_code.book_permissions,
    invitation_code_id = invitation_code.id,
    permission_expires_at = CASE
      WHEN invitation_code.validity_days IS NOT NULL
      THEN NOW() + (invitation_code.validity_days || ' days')::INTERVAL
      ELSE NULL
    END
  WHERE id = user_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS 策略更新
-- ============================================

-- 允许注册时使用邀请码（通过函数）
CREATE POLICY "允许通过函数使用邀请码" ON invitation_codes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 验证脚本
-- ============================================

-- 检查字段是否添加成功:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'invitation_codes'
-- ORDER BY ordinal_position;

-- 查看所有邀请码及其套餐关联:
-- SELECT
--   ic.code,
--   ic.package_id,
--   ip.name as package_name,
--   ic.feature_permissions,
--   ic.book_permissions,
--   ic.validity_days,
--   ic.used_by,
--   ic.is_exported
-- FROM invitation_codes ic
-- LEFT JOIN invitation_packages ip ON ic.package_id = ip.id
-- ORDER BY ic.created_at DESC;

-- 测试使用邀请码函数:
-- SELECT use_invitation_code('ABCD-1234', '<user_id>'::UUID);

-- ============================================
-- 应用层使用说明
-- ============================================

-- 1. 创建邀请码流程：
--    - 选择套餐（package_id）
--    - 自动复制套餐的权限到邀请码的快照字段
--    - 生成8位随机码
--    - 设置 max_uses = 1（一次性使用）

-- 2. 用户注册流程：
--    - 验证邀请码是否有效
--    - 调用 use_invitation_code() 函数使用邀请码
--    - 用户自动获得邀请码对应的权限

-- 3. 邀请码导出：
--    - 导出时设置 is_exported = true, exported_at = NOW()
--    - 可以按导出状态筛选

-- 4. 套餐快照机制：
--    - 邀请码创建时复制套餐权限
--    - 套餐后续修改不影响已创建的邀请码
--    - 保证权限的稳定性
