-- 修复单词状态保存问题
-- 1. 修复 word_progress 表的检查约束
-- 2. 修复 add_to_mistakes 触发器（使用 'fuzzy' 而不是 'vague'）
-- 3. 修复 mistakes 表的 RLS 策略

-- ============================================
-- 1. 修复 word_progress 表的检查约束
-- ============================================
ALTER TABLE word_progress DROP CONSTRAINT IF EXISTS word_progress_status_check;

ALTER TABLE word_progress ADD CONSTRAINT word_progress_status_check
  CHECK (status IN ('new', 'known', 'fuzzy', 'unknown'));

-- ============================================
-- 2. 修复 add_to_mistakes 触发器
-- ============================================
CREATE OR REPLACE FUNCTION add_to_mistakes()
RETURNS TRIGGER AS $$
BEGIN
  -- 当状态为 'fuzzy' 或 'unknown' 时，自动添加到错题本
  IF NEW.status IN ('fuzzy', 'unknown') THEN
    INSERT INTO mistakes (user_id, word_id, book_id, wrong_count, last_wrong_at)
    VALUES (NEW.user_id, NEW.word_id, NEW.book_id, 1, NOW())
    ON CONFLICT (user_id, word_id, book_id)
    DO UPDATE SET
      wrong_count = mistakes.wrong_count + 1,
      last_wrong_at = NOW(),
      is_resolved = false;
  END IF;

  -- 当状态变为 'known' 时，标记错题已解决
  IF NEW.status = 'known' THEN
    UPDATE mistakes
    SET is_resolved = true,
        updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND word_id = NEW.word_id
      AND book_id = NEW.book_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. 修复 mistakes 表的 RLS 策略
-- ============================================
-- 首先启用 RLS
ALTER TABLE mistakes ENABLE ROW LEVEL SECURITY;

-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Users can view own mistakes" ON mistakes;
DROP POLICY IF EXISTS "Users can insert own mistakes" ON mistakes;
DROP POLICY IF EXISTS "Users can update own mistakes" ON mistakes;
DROP POLICY IF EXISTS "Users can delete own mistakes" ON mistakes;

-- 创建新的 RLS 策略
CREATE POLICY "Users can view own mistakes"
  ON mistakes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own mistakes"
  ON mistakes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own mistakes"
  ON mistakes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own mistakes"
  ON mistakes FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 4. 同样修复 add_to_vocabulary_calendar 触发器
-- ============================================
CREATE OR REPLACE FUNCTION add_to_vocabulary_calendar()
RETURNS TRIGGER AS $$
BEGIN
  -- 当状态为 'fuzzy' 或 'unknown' 时，自动记录到生词日历
  IF NEW.status IN ('fuzzy', 'unknown') THEN
    INSERT INTO vocabulary_calendar (user_id, word_id, book_id, date, status)
    VALUES (NEW.user_id, NEW.word_id, NEW.book_id, CURRENT_DATE, NEW.status)
    ON CONFLICT (user_id, word_id, date)
    DO UPDATE SET
      status = NEW.status,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 验证约束是否正确
-- ============================================
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS check_clause
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'word_progress'
  AND con.contype = 'C';

-- ============================================
-- 6. 验证 RLS 策略是否正确
-- ============================================
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
WHERE tablename = 'mistakes';
