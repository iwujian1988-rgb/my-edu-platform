/**
 * 演说家模块 - 数据库表创建
 *
 * 严格按照 shangwenjie.md 第 6 节（数据库表结构）实现
 *
 * 表列表：
 * - speaker_articles: 文章元数据表
 * - speaker_sentences: 句子表
 * - speaker_progress: 学习进度表
 * - speaker_dictation_submissions: 听写提交记录表
 * - speaker_ghost_words: 魔鬼生词本表
 */

-- ========================================
-- 0. 启用必要的扩展
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. speaker_articles - 文章表
-- ========================================
CREATE TABLE IF NOT EXISTS speaker_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level INTEGER NOT NULL CHECK (level IN (2, 3)),

  -- 元数据
  title TEXT NOT NULL,
  source_url TEXT,
  audio_url TEXT NOT NULL,
  image_url TEXT,
  has_preroll_ad BOOLEAN DEFAULT false,

  -- 统计
  total_sentences INTEGER NOT NULL,
  duration_seconds INTEGER,
  word_count INTEGER,

  -- 时间戳
  json_data JSONB NOT NULL,

  -- 状态
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_speaker_articles_level ON speaker_articles(level);
CREATE INDEX IF NOT EXISTS idx_speaker_articles_status ON speaker_articles(status);

-- ========================================
-- 2. speaker_sentences - 句子表
-- ========================================
CREATE TABLE IF NOT EXISTS speaker_sentences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES speaker_articles(id) ON DELETE CASCADE,

  sentence_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start_time DECIMAL(10, 3),
  end_time DECIMAL(10, 3),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(article_id, sentence_index)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_speaker_sentences_article_id ON speaker_sentences(article_id);

-- ========================================
-- 3. speaker_progress - 学习进度表
-- ========================================
CREATE TABLE IF NOT EXISTS speaker_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES speaker_articles(id) ON DELETE CASCADE,

  -- 4 步骤完成状态
  step1_completed BOOLEAN DEFAULT false,
  step1_last_position DECIMAL(10, 3),

  step2_completed BOOLEAN DEFAULT false,
  step2_draft JSONB,
  step2_last_sentence_index INTEGER,

  step3_completed BOOLEAN DEFAULT false,
  step3_practiced_sentences INTEGER[],

  step4_completed BOOLEAN DEFAULT false,

  -- 整体状态
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, article_id)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_speaker_progress_user_id ON speaker_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_speaker_progress_article_id ON speaker_progress(article_id);
CREATE INDEX IF NOT EXISTS idx_speaker_progress_status ON speaker_progress(status);

-- ========================================
-- 4. speaker_dictation_submissions - 听写提交记录表
-- ========================================
CREATE TABLE IF NOT EXISTS speaker_dictation_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES speaker_articles(id) ON DELETE CASCADE,

  -- 提交数据
  answers JSONB NOT NULL,
  total_sentences INTEGER NOT NULL,
  total_words INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_count INTEGER NOT NULL,
  skipped_count INTEGER NOT NULL,
  accuracy_rate DECIMAL(5, 2),

  -- 时间
  time_spent_seconds INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_speaker_dictation_submissions_user_id ON speaker_dictation_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_speaker_dictation_submissions_article_id ON speaker_dictation_submissions(article_id);

-- ========================================
-- 5. speaker_ghost_words - 魔鬼生词本表
-- ========================================
CREATE TABLE IF NOT EXISTS speaker_ghost_words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 单词数据
  word TEXT NOT NULL,
  article_id UUID NOT NULL REFERENCES speaker_articles(id),
  sentence_id INTEGER NOT NULL,
  sentence_text TEXT NOT NULL,
  start_time DECIMAL(10, 3),

  -- 错误类型
  error_type TEXT NOT NULL CHECK (error_type IN ('wrong', 'skipped')),

  -- 有道 API 数据（缓存）
  phonetic TEXT,
  definition TEXT,
  example_sentence TEXT,
  example_audio_url TEXT,

  -- 状态
  is_mastered BOOLEAN DEFAULT false,
  mastered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, word, article_id, sentence_id)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_speaker_ghost_words_user_id ON speaker_ghost_words(user_id);
CREATE INDEX IF NOT EXISTS idx_speaker_ghost_words_article_id ON speaker_ghost_words(article_id);
CREATE INDEX IF NOT EXISTS idx_speaker_ghost_words_is_mastered ON speaker_ghost_words(is_mastered);

-- ========================================
-- 启用 RLS (Row Level Security)
-- ========================================

ALTER TABLE speaker_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_dictation_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_ghost_words ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS 策略
-- ========================================

-- speaker_articles: 所有人可读，仅管理员可写
CREATE POLICY "允许所有人查看文章" ON speaker_articles
  FOR SELECT USING (true);

CREATE POLICY "仅管理员可插入文章" ON speaker_articles
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'authenticated');

CREATE POLICY "仅管理员可更新文章" ON speaker_articles
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'authenticated');

-- speaker_sentences: 所有人可读
CREATE POLICY "允许所有人查看句子" ON speaker_sentences
  FOR SELECT USING (true);

-- speaker_progress: 用户只能操作自己的进度
CREATE POLICY "用户可查看自己的进度" ON speaker_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可插入自己的进度" ON speaker_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可更新自己的进度" ON speaker_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- speaker_dictation_submissions: 用户只能操作自己的提交
CREATE POLICY "用户可查看自己的提交" ON speaker_dictation_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可插入自己的提交" ON speaker_dictation_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- speaker_ghost_words: 用户只能操作自己的生词
CREATE POLICY "用户可查看自己的生词" ON speaker_ghost_words
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可插入自己的生词" ON speaker_ghost_words
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可更新自己的生词" ON speaker_ghost_words
  FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 自动更新 updated_at 触发器
-- ========================================

CREATE OR REPLACE FUNCTION update_speaker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER speaker_articles_updated_at
  BEFORE UPDATE ON speaker_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_speaker_updated_at();

CREATE TRIGGER speaker_progress_updated_at
  BEFORE UPDATE ON speaker_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_speaker_updated_at();
