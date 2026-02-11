/**
 * 演说家模块 - 修复 RLS 策略（要求登录 + 管理员写权限）
 *
 * 安全原则：
 * 1. 所有操作都需要登录
 * 2. 文章的写入（INSERT/UPDATE）只有管理员可以进行
 * 3. 用户数据（进度/提交/生词）只能由用户自己操作
 */

-- ========================================
-- 1. 删除错误的策略
-- ========================================

DROP POLICY IF EXISTS "允许所有人查看文章" ON speaker_articles;
DROP POLICY IF EXISTS "仅管理员可插入文章" ON speaker_articles;
DROP POLICY IF EXISTS "仅管理员可更新文章" ON speaker_articles;

DROP POLICY IF EXISTS "允许所有人查看句子" ON speaker_sentences;

DROP POLICY IF EXISTS "用户可查看自己的进度" ON speaker_progress;
DROP POLICY IF EXISTS "用户可插入自己的进度" ON speaker_progress;
DROP POLICY IF EXISTS "用户可更新自己的进度" ON speaker_progress;

DROP POLICY IF EXISTS "用户可查看自己的提交" ON speaker_dictation_submissions;
DROP POLICY IF EXISTS "用户可插入自己的提交" ON speaker_dictation_submissions;

DROP POLICY IF EXISTS "用户可查看自己的生词" ON speaker_ghost_words;
DROP POLICY IF EXISTS "用户可插入自己的生词" ON speaker_ghost_words;
DROP POLICY IF EXISTS "用户可更新自己的生词" ON speaker_ghost_words;

-- ========================================
-- 2. speaker_articles - 已登录用户可读，仅管理员可写
-- ========================================

-- 已登录用户可以查看文章
CREATE POLICY "已登录用户可查看文章" ON speaker_articles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 仅管理员可以插入文章
CREATE POLICY "仅管理员可插入文章" ON speaker_articles
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.user_id = auth.uid()
      AND administrators.is_active = true
    )
  );

-- 仅管理员可以更新文章
CREATE POLICY "仅管理员可更新文章" ON speaker_articles
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.user_id = auth.uid()
      AND administrators.is_active = true
    )
  );

-- ========================================
-- 3. speaker_sentences - 已登录用户可读，仅管理员可写
-- ========================================

-- 已登录用户可以查看句子
CREATE POLICY "已登录用户可查看句子" ON speaker_sentences
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 仅管理员可以插入句子（通过应用层控制，通常批量插入）
CREATE POLICY "仅管理员可插入句子" ON speaker_sentences
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.user_id = auth.uid()
      AND administrators.is_active = true
    )
  );

-- ========================================
-- 4. speaker_progress - 用户只能操作自己的进度
-- ========================================

CREATE POLICY "用户可查看自己的进度" ON speaker_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可插入自己的进度" ON speaker_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可更新自己的进度" ON speaker_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 5. speaker_dictation_submissions - 用户只能操作自己的提交
-- ========================================

CREATE POLICY "用户可查看自己的提交" ON speaker_dictation_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可插入自己的提交" ON speaker_dictation_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 6. speaker_ghost_words - 用户只能操作自己的生词
-- ========================================

CREATE POLICY "用户可查看自己的生词" ON speaker_ghost_words
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可插入自己的生词" ON speaker_ghost_words
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可更新自己的生词" ON speaker_ghost_words
  FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 7. 完成提示
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS 策略已更新：';
  RAISE NOTICE '  - 所有操作都需要登录';
  RAISE NOTICE '  - 文章的写入（INSERT/UPDATE）只有管理员可以进行';
  RAISE NOTICE '  - 用户数据（进度/提交/生词）只能由用户自己操作';
END $$;
