-- 为 user_book_preferences 表添加 last_reading_progress 字段
-- 用于保存用户的阅读进度（页码和筛选条件）

-- 添加字段
ALTER TABLE user_book_preferences
ADD COLUMN IF NOT EXISTS last_reading_progress JSONB;

-- 添加注释
COMMENT ON COLUMN user_book_preferences.last_reading_progress IS '保存用户最后的阅读进度，包含页码和筛选条件';

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_user_book_preferences_reading_progress_book_id
ON user_book_preferences ((last_reading_progress->>'bookId'))
WHERE last_reading_progress IS NOT NULL;
