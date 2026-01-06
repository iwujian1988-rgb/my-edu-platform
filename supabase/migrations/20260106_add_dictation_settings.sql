-- 添加听写模式设置字段到 user_book_preferences 表
ALTER TABLE user_book_preferences
ADD COLUMN shuffle_order BOOLEAN DEFAULT false,
ADD COLUMN auto_remove_from_mistakes BOOLEAN DEFAULT false,
ADD COLUMN consecutive_correct_threshold INTEGER DEFAULT 3;

-- 添加连续答对计数字段到 word_progress 表
ALTER TABLE word_progress
ADD COLUMN consecutive_correct_count INTEGER DEFAULT 0;

-- 添加注释
COMMENT ON COLUMN user_book_preferences.shuffle_order IS '是否启用乱序模式';
COMMENT ON COLUMN user_book_preferences.auto_remove_from_mistakes IS '是否启用答对后自动从错词本移除';
COMMENT ON COLUMN user_book_preferences.consecutive_correct_threshold IS '连续答对N次后从错词本移除（默认3次）';
COMMENT ON COLUMN word_progress.consecutive_correct_count IS '当前连续答对次数（用于自动移除错词功能）';
