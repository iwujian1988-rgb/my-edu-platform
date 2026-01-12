-- 添加 preferences JSONB 字段到 user_book_preferences 表
-- 用于存储各种用户偏好设置，包括flashcard学习进度

ALTER TABLE user_book_preferences
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- 添加注释
COMMENT ON COLUMN user_book_preferences.preferences IS '用户偏好设置，JSON格式。包括flashcard学习进度等。结构：{ flashcard_progress_{bookId}_{scopeType}: { currentIndex, totalWords, lastStudyTime, scopeType } }';

-- 创建 GIN 索引用于快速查询 JSONB 数据
CREATE INDEX IF NOT EXISTS idx_user_book_preferences_preferences_gin ON user_book_preferences USING GIN (preferences);
