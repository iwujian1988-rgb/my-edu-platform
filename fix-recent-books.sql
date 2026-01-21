-- 修复 user_book_preferences 表的 RLS 策略
-- 确保用户可以查询自己的 last_accessed_at 字段

-- 1. 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Users can view own book preferences" ON user_book_preferences;
DROP POLICY IF EXISTS "Users can insert own book preferences" ON user_book_preferences;
DROP POLICY IF EXISTS "Users can update own book preferences" ON user_book_preferences;

-- 2. 创建新的策略（包含 last_accessed_at 字段）
CREATE POLICY "Users can view own book preferences"
ON user_book_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own book preferences"
ON user_book_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own book preferences"
ON user_book_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. 确保 last_accessed_at 字段存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_book_preferences'
    AND column_name = 'last_accessed_at'
  ) THEN
    ALTER TABLE user_book_preferences ADD COLUMN last_accessed_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_book_preferences_last_accessed
ON user_book_preferences(user_id, last_accessed_at DESC);
