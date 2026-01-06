-- 修复 user_book_preferences 表的 book_id 字段类型
-- 从 UUID 改为 TEXT，以支持非 UUID 的 book_id（如 slug）

-- 1. 删除旧表
DROP TABLE IF EXISTS user_book_preferences CASCADE;

-- 2. 重新创建表，book_id 改为 TEXT 类型
CREATE TABLE user_book_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,  -- 改为 TEXT 类型
  hide_chinese BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_book_prefs_user_id ON user_book_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_book_prefs_book_id ON user_book_preferences(book_id);

-- 4. 添加更新时间戳触发器
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

-- 5. 添加注释
COMMENT ON TABLE user_book_preferences IS '用户对单词书的偏好设置';
COMMENT ON COLUMN user_book_preferences.book_id IS '词书ID（TEXT类型，支持UUID或slug）';
COMMENT ON COLUMN user_book_preferences.hide_chinese IS '是否隐藏中文释义（用于自我测试）';
