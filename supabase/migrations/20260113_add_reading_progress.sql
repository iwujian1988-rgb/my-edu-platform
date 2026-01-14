-- 添加阅读进度字段到user_preferences表
-- 用于保存用户的断点续读进度

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS last_reading_progress JSONB;

-- 添加注释
COMMENT ON COLUMN user_preferences.last_reading_progress IS '保存用户最后的阅读进度，包含页码和筛选条件';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_preferences_reading_progress
ON user_preferences ((last_reading_progress->>'bookId'))
WHERE last_reading_progress IS NOT NULL;
