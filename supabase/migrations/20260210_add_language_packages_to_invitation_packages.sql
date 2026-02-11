/**
 * 套餐表新增 language_packages 字段
 *
 * 套餐现在包含：
 * 1. feature_permissions - 功能权限（消消乐、卡片背单词、雯姐学习法等）
 * 2. book_permissions - 单词书权限
 * 3. language_packages - 语言包权限（新增，如 ["en", "fr", "es"]）
 */

-- ========================================
-- 添加 language_packages 字段
-- ========================================
ALTER TABLE invitation_packages
ADD COLUMN IF NOT EXISTS language_packages TEXT[];

-- ========================================
-- 添加注释
-- ========================================
COMMENT ON COLUMN invitation_packages.language_packages IS '套餐包含的语言包列表，如 ["en", "fr", "es", "de", "ja", "pl"]';

-- ========================================
-- 更新现有套餐数据（可选）
-- ========================================
-- 示例：给某个套餐添加英语语言包
-- UPDATE invitation_packages
-- SET language_packages = ARRAY['en']
-- WHERE id = '某个套餐ID';
