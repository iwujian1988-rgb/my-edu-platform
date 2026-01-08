-- ============================================
-- 创建 invitation_packages 表 - 邀请码套餐管理
-- 版本: v1.0
-- 创建日期: 2026-01-07
-- 说明: 支持套餐化的权限管理，套餐包含功能权限、单词书权限和有效期
-- ============================================

-- 步骤 1: 创建套餐表
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

-- 步骤 2: 添加注释
COMMENT ON TABLE invitation_packages IS '邀请码套餐表 - 管理权限套餐';
COMMENT ON COLUMN invitation_packages.id IS '套餐ID';
COMMENT ON COLUMN invitation_packages.name IS '套餐名称，如"1年基础版"';
COMMENT ON COLUMN invitation_packages.description IS '套餐描述';
COMMENT ON COLUMN invitation_packages.validity_days IS '有效期天数，NULL表示永久有效';
COMMENT ON COLUMN invitation_packages.feature_permissions IS '功能权限数组，如["match_game", "flashcard", "custom_book"]';
COMMENT ON COLUMN invitation_packages.book_permissions IS '单词书权限数组，如["cet4", "toefl"]或["*"]表示全部';
COMMENT ON COLUMN invitation_packages.is_active IS '是否启用';
COMMENT ON COLUMN invitation_packages.sort_order IS '排序顺序，数字越小越靠前';
COMMENT ON COLUMN invitation_packages.created_at IS '创建时间';
COMMENT ON COLUMN invitation_packages.updated_at IS '更新时间';

-- 步骤 3: 添加索引
CREATE INDEX IF NOT EXISTS idx_invitation_packages_is_active ON invitation_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_invitation_packages_sort_order ON invitation_packages(sort_order);

-- 步骤 4: 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION update_invitation_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invitation_packages_updated_at
  BEFORE UPDATE ON invitation_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_packages_updated_at();

-- 步骤 5: 启用 RLS (行级安全)
ALTER TABLE invitation_packages ENABLE ROW LEVEL SECURITY;

-- 步骤 6: 创建 RLS 策略
-- 管理员可以完全访问
CREATE POLICY "管理员可以查看所有套餐" ON invitation_packages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.user_id = auth.uid()
      AND administrators.is_active = true
    )
  );

CREATE POLICY "管理员可以插入套餐" ON invitation_packages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.user_id = auth.uid()
      AND administrators.is_active = true
    )
  );

CREATE POLICY "管理员可以更新套餐" ON invitation_packages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.user_id = auth.uid()
      AND administrators.is_active = true
    )
  );

CREATE POLICY "管理员可以删除套餐" ON invitation_packages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.user_id = auth.uid()
      AND administrators.is_active = true
    )
  );

-- ============================================
-- 初始数据
-- ============================================

-- 插入示例套餐
INSERT INTO invitation_packages (name, description, validity_days, feature_permissions, book_permissions, is_active, sort_order) VALUES
  (
    '1年基础版',
    '基础功能套餐，包含核心学习功能',
    365,
    ARRAY['match_game', 'flashcard'],
    ARRAY['cet4', 'high_school_3500'],
    true,
    1
  ),
  (
    '1年进阶版',
    '进阶功能套餐，包含更多学习模式',
    365,
    ARRAY['match_game', 'flashcard', 'dictation', 'custom_book'],
    ARRAY['cet4', 'cet6', 'toefl', 'ielts', 'high_school_3500'],
    true,
    2
  ),
  (
    '永久高级版',
    '永久有效的高级套餐，包含所有功能',
    NULL,
    ARRAY['match_game', 'flashcard', 'dictation', 'custom_book', 'review_mode'],
    ARRAY['*'],
    true,
    3
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 验证脚本
-- ============================================

-- 检查表是否创建成功:
-- SELECT table_name, column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'invitation_packages'
-- ORDER BY ordinal_position;

-- 查看所有套餐:
-- SELECT * FROM invitation_packages ORDER BY sort_order;

-- ============================================
-- 应用层使用说明
-- ============================================

-- 1. 创建套餐: 使用 service role 客户端绕过 RLS
-- 2. 邀请码创建时选择套餐，自动复制权限快照
-- 3. 套餐权限更新后，不影响已创建的邀请码（快照机制）
-- 4. 管理后台可以启用/禁用套餐
