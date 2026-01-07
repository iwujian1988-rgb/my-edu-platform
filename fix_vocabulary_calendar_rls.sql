-- ============================================
-- 修复 vocabulary_calendar 表的 RLS 策略
-- ============================================

-- 1. 启用 RLS（如果未启用）
ALTER TABLE vocabulary_calendar ENABLE ROW LEVEL SECURITY;

-- 2. 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Users can view own vocabulary calendar" ON vocabulary_calendar;
DROP POLICY IF EXISTS "Users can insert own vocabulary calendar" ON vocabulary_calendar;
DROP POLICY IF EXISTS "Users can update own vocabulary calendar" ON vocabulary_calendar;
DROP POLICY IF EXISTS "Users can delete own vocabulary calendar" ON vocabulary_calendar;

-- 3. 创建新的 RLS 策略
CREATE POLICY "Users can view own vocabulary calendar"
  ON vocabulary_calendar FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own vocabulary calendar"
  ON vocabulary_calendar FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vocabulary calendar"
  ON vocabulary_calendar FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own vocabulary calendar"
  ON vocabulary_calendar FOR DELETE
  USING (user_id = auth.uid());

-- 4. 验证策略是否创建成功
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'vocabulary_calendar';
