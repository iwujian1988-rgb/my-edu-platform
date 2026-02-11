/**
 * 用户表新增 language_packages 字段
 *
 * 用于用户级别的语言包权限覆盖
 * 与 feature_permissions, book_permissions 类似
 */

-- 添加 language_packages 字段
ALTER TABLE users
ADD COLUMN IF NOT EXISTS language_packages TEXT[];

-- 添加注释
COMMENT ON COLUMN users.language_packages IS '用户语言包权限（覆盖套餐默认），如 ["en", "fr", "es"]';
