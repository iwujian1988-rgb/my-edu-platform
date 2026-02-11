/**
 * 演说家模块 - 多语言支持和分类功能
 *
 * 功能：
 * 1. 支持多语种（en, pl, es, fr, de, ja）
 * 2. 支持6大分类（健康、心理、成长、学习、社交、生活）
 * 3. 用户语言包购买权限管理
 * 4. RLS 策略更新（只能查看已购语言的文章）
 *
 * 参考：
 * - shangwenjie.md（演说家需求文档）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术改造方案）
 */

-- ========================================
-- 1. speaker_articles 表增加字段
-- ========================================

-- 添加语言字段（默认英文）
ALTER TABLE speaker_articles
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'
  CHECK (language IN ('en', 'pl', 'es', 'fr', 'de', 'ja'));

-- 添加分类字段
ALTER TABLE speaker_articles
  ADD COLUMN IF NOT EXISTS category TEXT
  CHECK (category IN ('健康', '心理', '成长', '学习', '社交', '生活'));

-- 为现有文章设置默认分类（如果有旧数据）
UPDATE speaker_articles
SET category = '学习'
WHERE category IS NULL;

-- 添加索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_speaker_articles_language ON speaker_articles(language);
CREATE INDEX IF NOT EXISTS idx_speaker_articles_category ON speaker_articles(category);
CREATE INDEX IF NOT EXISTS idx_speaker_articles_lang_cat ON speaker_articles(language, category);

-- ========================================
-- 2. 用户语言包购买记录表（speaker_ 前缀）
-- ========================================

CREATE TABLE IF NOT EXISTS speaker_user_language_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 语言信息
  language TEXT NOT NULL CHECK (language IN ('en', 'pl', 'es', 'fr', 'de', 'ja')),

  -- 购买信息
  purchase_type TEXT NOT NULL DEFAULT 'subscription' CHECK (purchase_type IN ('subscription', 'lifetime')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- 订阅制有到期时间，永久包为 NULL

  -- 支付信息（可选）
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'CNY',
  payment_method TEXT,
  order_id TEXT,
  transaction_id TEXT,

  -- 状态
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'refunded')),

  -- 备注
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, language)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_speaker_user_language_purchases_user ON speaker_user_language_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_speaker_user_language_purchases_language ON speaker_user_language_purchases(language);
CREATE INDEX IF NOT EXISTS idx_speaker_user_language_purchases_expires ON speaker_user_language_purchases(expires_at);
CREATE INDEX IF NOT EXISTS idx_speaker_user_language_purchases_status ON speaker_user_language_purchases(status);

-- ========================================
-- 3. 语言包产品配置表（speaker_ 前缀，后台管理用）
-- ========================================

CREATE TABLE IF NOT EXISTS speaker_language_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 产品信息
  language TEXT NOT NULL CHECK (language IN ('en', 'pl', 'es', 'fr', 'de', 'ja')),
  language_name TEXT NOT NULL,  -- 显示名称，如 "英语"、"波兰语"

  -- 定价
  price_monthly DECIMAL(10, 2),
  price_yearly DECIMAL(10, 2),
  price_lifetime DECIMAL(10, 2),

  -- 产品状态
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- 描述
  description TEXT,
  features JSONB,  -- 产品特性列表

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(language)
);

-- 插入默认语言包产品
INSERT INTO speaker_language_products (language, language_name, price_monthly, price_yearly, price_lifetime, sort_order, features) VALUES
  ('en', '英语', 29.00, 288.00, 688.00, 1, '["精选 BBC 6 Minute English", "NPR 新闻素材", "难度分级 L1-L3", "每日更新"]'::jsonb),
  ('pl', '波兰语', 39.00, 388.00, 888.00, 2, '["波兰语原版音频", "文化背景介绍", "实用对话场景", "语法要点讲解"]'::jsonb),
  ('es', '西班牙语', 29.00, 288.00, 688.00, 3, '["拉美热门话题", "地道口语表达", "语速分级练习", "文化专题"]'::jsonb),
  ('fr', '法语', 39.00, 388.00, 888.00, 4, '[" France Culture 精选", "法语美文朗读", "发音技巧指导", "文化深度解析"]'::jsonb),
  ('de', '德语', 39.00, 388.00, 888.00, 5, '["DW 新闻听力", "德语故事会", "语法系统训练", "德国文化专题"]'::jsonb),
  ('ja', '日语', 29.00, 288.00, 688.00, 6, '["NHK 新闻慢速", "日常会话场景", "商务日语表达", "日本文化介绍"]'::jsonb)
ON CONFLICT (language) DO NOTHING;

-- ========================================
-- 4. 更新 RLS 策略（关键：语种级权限控制）
-- ========================================

-- 删除旧的"所有人可读"策略
DROP POLICY IF EXISTS "允许所有人查看文章" ON speaker_articles;

-- 新策略：用户只能查看已购买语言的文章（且在有效期内）
CREATE POLICY "用户只能查看已购买语言的文章" ON speaker_articles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM speaker_user_language_purchases
      WHERE speaker_user_language_purchases.user_id = auth.uid()
        AND speaker_user_language_purchases.language = speaker_articles.language
        AND speaker_user_language_purchases.status = 'active'
        AND (speaker_user_language_purchases.expires_at IS NULL OR speaker_user_language_purchases.expires_at > NOW())
    )
  );

-- 保持原有的写入策略（仅管理员可操作）
DROP POLICY IF EXISTS "仅管理员可插入文章" ON speaker_articles;
CREATE POLICY "仅管理员可插入文章" ON speaker_articles
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'authenticated');

DROP POLICY IF EXISTS "仅管理员可更新文章" ON speaker_articles;
CREATE POLICY "仅管理员可更新文章" ON speaker_articles
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'authenticated');

-- ========================================
-- 5. speaker_user_language_purchases 表的 RLS 策略
-- ========================================

ALTER TABLE speaker_user_language_purchases ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的购买记录
CREATE POLICY "用户可查看自己的语言包" ON speaker_user_language_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- 系统可插入购买记录（通过支付回调）
CREATE POLICY "系统可插入语言包购买记录" ON speaker_user_language_purchases
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'authenticated');

-- 用户可更新自己的购买记录（如续费）
CREATE POLICY "用户可更新自己的语言包" ON speaker_user_language_purchases
  FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 6. speaker_language_products 表的 RLS 策略
-- ========================================

ALTER TABLE speaker_language_products ENABLE ROW LEVEL SECURITY;

-- 所有人可查看语言包产品
CREATE POLICY "所有人可查看语言包产品" ON speaker_language_products
  FOR SELECT USING (true);

-- 仅管理员可管理产品
CREATE POLICY "仅管理员可插入语言包产品" ON speaker_language_products
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'authenticated');

CREATE POLICY "仅管理员可更新语言包产品" ON speaker_language_products
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'authenticated');

CREATE POLICY "仅管理员可删除语言包产品" ON speaker_language_products
  FOR DELETE USING (auth.jwt() ->> 'role' = 'authenticated');

-- ========================================
-- 7. 自动更新 updated_at 触发器
-- ========================================

CREATE TRIGGER speaker_language_products_updated_at
  BEFORE UPDATE ON speaker_language_products
  FOR EACH ROW
  EXECUTE FUNCTION update_speaker_updated_at();

CREATE TRIGGER speaker_user_language_purchases_updated_at
  BEFORE UPDATE ON speaker_user_language_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_speaker_updated_at();

-- ========================================
-- 8. 更新测试数据（将现有文章分配不同语种和分类）
-- ========================================

-- 为测试文章添加语种和分类标签
DO $$
DECLARE
  article_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO article_count FROM speaker_articles;

  IF article_count >= 1 THEN
    UPDATE speaker_articles
    SET language = 'en', category = '健康'
    WHERE id = (SELECT id FROM speaker_articles ORDER BY created_at LIMIT 1 OFFSET 0);
  END IF;

  IF article_count >= 2 THEN
    UPDATE speaker_articles
    SET language = 'en', category = '学习'
    WHERE id = (SELECT id FROM speaker_articles ORDER BY created_at LIMIT 1 OFFSET 1);
  END IF;

  IF article_count >= 3 THEN
    UPDATE speaker_articles
    SET language = 'pl', category = '成长'
    WHERE id = (SELECT id FROM speaker_articles ORDER BY created_at LIMIT 1 OFFSET 2);
  END IF;

  IF article_count >= 4 THEN
    UPDATE speaker_articles
    SET language = 'en', category = '社交'
    WHERE id = (SELECT id FROM speaker_articles ORDER BY created_at LIMIT 1 OFFSET 3);
  END IF;
END $$;

-- ========================================
-- 9. 为测试用户添加语言包权限（仅开发环境）
-- ========================================

-- 给所有已注册用户添加英文权限（默认）
INSERT INTO speaker_user_language_purchases (user_id, language, purchase_type, expires_at, status)
SELECT
  id,
  'en',
  'lifetime',
  NULL,
  'active'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM speaker_user_language_purchases
  WHERE speaker_user_language_purchases.user_id = auth.users.id
    AND speaker_user_language_purchases.language = 'en'
);

-- ========================================
-- 10. 创建辅助视图（方便查询）
-- ========================================

-- 用户可用语言视图
CREATE OR REPLACE VIEW user_available_languages AS
SELECT
  u.id AS user_id,
  lp.language,
  lp.language_name,
  lp.price_monthly,
  lp.price_yearly,
  lp.price_lifetime,
  lp.is_active,
  ulp.purchase_type,
  ulp.expires_at,
  ulp.status AS purchase_status,
  CASE
    WHEN ulp.id IS NOT NULL AND (ulp.expires_at IS NULL OR ulp.expires_at > NOW()) THEN true
    ELSE false
  END AS is_purchased
FROM auth.users u
CROSS JOIN speaker_language_products lp
LEFT JOIN speaker_user_language_purchases ulp
  ON ulp.user_id = u.id
  AND ulp.language = lp.language
  AND ulp.status = 'active'
WHERE lp.is_active = true;

-- ========================================
-- 迁移完成
-- ========================================

-- 验证迁移
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 多语言和分类功能迁移完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '新增功能：';
  RAISE NOTICE '  1. 支持语言: en, pl, es, fr, de, ja';
  RAISE NOTICE '  2. 支持6大分类: 健康、心理、成长、学习、社交、生活';
  RAISE NOTICE '  3. 用户语言包购买权限管理';
  RAISE NOTICE '  4. RLS 策略已更新（只能查看已购语言）';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '  1. 更新 API 和前端代码中的表名引用';
  RAISE NOTICE '  2. 运行此迁移文件';
  RAISE NOTICE '  3. 测试功能';
  RAISE NOTICE '========================================';
END $$;
