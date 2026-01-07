-- 添加学习状态恢复字段到 user_book_preferences 表
-- 用于支持"继续学习"功能，记录用户最后的学习位置

-- 添加 JSONB 字段用于存储学习状态
ALTER TABLE user_book_preferences
ADD COLUMN IF NOT EXISTS last_resume_state JSONB DEFAULT '{}'::jsonb;

-- 添加注释
COMMENT ON COLUMN user_book_preferences.last_resume_state IS '用户最后的学习状态，用于恢复学习位置。结构：{ mode, bookId, context: {...}, updatedAt }';
