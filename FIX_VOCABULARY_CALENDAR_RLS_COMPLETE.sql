-- ============================================
-- 完整修复：vocabulary_calendar 表的 RLS 策略
-- ============================================

-- 步骤 1：检查表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'vocabulary_calendar'
);

-- 步骤 2：查看当前的 RLS 策略
SELECT * FROM pg_policies
WHERE tablename = 'vocabulary_calendar';

-- 步骤 3：删除所有现有策略
DROP POLICY IF EXISTS "Users can view own vocabulary calendar" ON vocabulary_calendar;
DROP POLICY IF EXISTS "Users can insert own vocabulary calendar" ON vocabulary_calendar;
DROP POLICY IF EXISTS "Users can update own vocabulary calendar" ON vocabulary_calendar;
DROP POLICY IF EXISTS "Users can delete own vocabulary calendar" ON vocabulary_calendar;

-- 步骤 4：确保 RLS 已启用
ALTER TABLE vocabulary_calendar ENABLE ROW LEVEL SECURITY;

-- 步骤 5：创建新的 RLS 策略
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

-- 步骤 6：验证策略是否创建成功
SELECT
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'vocabulary_calendar';
