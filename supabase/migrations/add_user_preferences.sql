-- 创建用户偏好设置表
CREATE TABLE IF NOT EXISTS user_book_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  hide_chinese BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_user_book_prefs_user_id ON user_book_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_book_prefs_book_id ON user_book_preferences(book_id);

-- 添加更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_book_preferences_updated_at
BEFORE UPDATE ON user_book_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE user_book_preferences IS '用户对单词书的偏好设置';
COMMENT ON COLUMN user_book_preferences.hide_chinese IS '是否隐藏中文释义（用于自我测试）';
