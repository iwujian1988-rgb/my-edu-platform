-- 创建全局用户偏好设置表
-- 用于保存用户的全局偏好设置（如阅读进度、主题等）
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  last_reading_progress JSONB,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'zh-CN',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_reading_progress
ON user_preferences ((last_reading_progress->>'bookId'))
WHERE last_reading_progress IS NOT NULL;

-- 添加更新时间戳触发器
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE user_preferences IS '用户的全局偏好设置';
COMMENT ON COLUMN user_preferences.last_reading_progress IS '保存用户最后的阅读进度，包含页码和筛选条件';
COMMENT ON COLUMN user_preferences.theme IS '用户界面主题';
COMMENT ON COLUMN user_preferences.language IS '用户界面语言';

-- 启用RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略：用户只能读写自己的偏好设置
CREATE POLICY "Users can view own preferences"
ON user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
ON user_preferences FOR DELETE
USING (auth.uid() = user_id);
