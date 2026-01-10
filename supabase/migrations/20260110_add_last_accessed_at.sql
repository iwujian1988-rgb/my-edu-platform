-- 添加 last_accessed_at 字段到 user_book_preferences 表
-- 用于追踪用户最近访问的词库

ALTER TABLE user_book_preferences
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT NOW();

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_book_preferences_last_accessed
ON user_book_preferences(user_id, last_accessed_at DESC);

-- 添加注释
COMMENT ON COLUMN user_book_preferences.last_accessed_at IS '用户最近访问该词库的时间';
