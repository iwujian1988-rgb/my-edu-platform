-- ============================================
-- 小语笔记 - 数据库模式定义
-- 版本: v3.2.1
-- 更新日期: 2026-01-06
-- ============================================
--
-- 表创建顺序（考虑外键依赖关系）:
-- 1. users (无依赖)
-- 2. invitation_codes (依赖 users)
-- 3. user_quotas (依赖 users)
-- 4. themes (无依赖)
-- 5. scenes (依赖 themes)
-- 6. books (依赖 users)
-- 7. chapters (依赖 books, themes, scenes)
-- 8. words (依赖 chapters)
-- 9. word_progress (依赖 users, words, books)
-- 10. learning_records (依赖 users, books, words)
-- 11. mistakes (依赖 users, words, books)
-- 12. vocabulary_calendar (依赖 users, words, books)

-- ============================================
-- 核心用户系统
-- ============================================

-- --------------------------------------------
-- users: 用户表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(11) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- --------------------------------------------
-- invitation_codes: 邀请码表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(8) UNIQUE NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_active ON invitation_codes(is_active, expires_at);

-- --------------------------------------------
-- user_quotas: 用户配额表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  daily_smart_import_limit INTEGER DEFAULT 500,
  daily_smart_import_used INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON user_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_reset_date ON user_quotas(last_reset_date);

-- --------------------------------------------
-- daily_quota_reset: 每日配额重置函数
-- --------------------------------------------
CREATE OR REPLACE FUNCTION reset_daily_quota()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果最后重置日期不是今天，重置已用配额
  IF NEW.last_reset_date <> CURRENT_DATE THEN
    NEW.daily_smart_import_used := 0;
    NEW.last_reset_date := CURRENT_DATE;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_daily_quota
BEFORE INSERT OR UPDATE ON user_quotas
FOR EACH ROW
EXECUTE FUNCTION reset_daily_quota();

-- ============================================
-- 内容分类系统
-- ============================================

-- --------------------------------------------
-- themes: 主题表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 示例数据：商务、旅游、日常、科技等

-- --------------------------------------------
-- scenes: 场景表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID REFERENCES themes(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_scenes_theme_id ON scenes(theme_id);

-- 示例数据：机场、酒店、餐厅、会议等（关联主题）

-- ============================================
-- 词书系统
-- ============================================

-- --------------------------------------------
-- books: 单词书表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url VARCHAR(500),
  category VARCHAR(50) CHECK (category IN ('exam', 'scenario', 'textbook', 'custom')),
  is_official BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  total_words INTEGER DEFAULT 0,
  total_chapters INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_created_by ON books(created_by);
CREATE INDEX IF NOT EXISTS idx_books_published ON books(is_published, category);

-- --------------------------------------------
-- chapters: 章节表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  order_index INTEGER NOT NULL,
  theme_id UUID REFERENCES themes(id),
  scene_id UUID REFERENCES scenes(id),
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_chapters_theme ON chapters(theme_id);
CREATE INDEX IF NOT EXISTS idx_chapters_scene ON chapters(scene_id);

-- --------------------------------------------
-- words: 单词表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  word VARCHAR(255) NOT NULL,
  phonetic VARCHAR(255),
  definition TEXT NOT NULL,
  definition_en TEXT,
  collocation TEXT,
  collocation_en TEXT,
  example_sentence TEXT,
  example_sentence_en TEXT,
  part_of_speech VARCHAR(50),
  audio_url VARCHAR(500),
  order_index INTEGER DEFAULT 0,
  difficulty_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_words_chapter_id ON words(chapter_id);
CREATE INDEX IF NOT EXISTS idx_words_word ON words(word); -- 用于全局单词查询
CREATE INDEX IF NOT EXISTS idx_words_order ON words(chapter_id, order_index);

-- ============================================
-- 学习进度系统
-- ============================================

-- --------------------------------------------
-- word_progress: 单词学习进度表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS word_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('new', 'known', 'vague', 'unknown')) DEFAULT 'new',
  practice_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word_id, book_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_word_progress_user ON word_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_word_progress_word ON word_progress(word_id);
CREATE INDEX IF NOT EXISTS idx_word_progress_status ON word_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_word_progress_book ON word_progress(user_id, book_id);

-- --------------------------------------------
-- 全局单词状态映射表
-- --------------------------------------------
-- 用于实现"内容局部化，状态全局化"策略
-- 将不同词书中的同一单词（相同拼写）关联起来
CREATE OR REPLACE VIEW global_word_status AS
SELECT
  wp.user_id,
  w.word,
  MAX(wp.status) FILTER (
    WHERE wp.status IN ('known', 'vague', 'unknown')
  ) as global_status,
  COUNT(*) FILTER (WHERE wp.status = 'known') as known_count,
  COUNT(*) FILTER (WHERE wp.status = 'vague') as vague_count,
  COUNT(*) FILTER (WHERE wp.status = 'unknown') as unknown_count,
  MAX(wp.updated_at) as last_updated_at
FROM word_progress wp
JOIN words w ON wp.word_id = w.id
GROUP BY wp.user_id, w.word;

-- --------------------------------------------
-- 单词状态同步触发器
-- --------------------------------------------
-- 当单词状态更新时，同步同一用户在不同书中的状态
CREATE OR REPLACE FUNCTION sync_word_status()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新同一单词在不同词书中的状态
  -- 实现全局状态同步策略
  UPDATE word_progress
  SET status = NEW.status,
      updated_at = NOW()
  WHERE user_id = NEW.user_id
    AND word_id IN (
      -- 查找所有相同单词（根据单词拼写）
      SELECT id FROM words WHERE word = (
        SELECT word FROM words WHERE id = NEW.word_id
      )
    )
    AND id != NEW.id; -- 排除当前记录

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_word_status
AFTER UPDATE ON word_progress
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_word_status();

-- ============================================
-- 学习记录系统
-- ============================================

-- --------------------------------------------
-- learning_records: 学习记录表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  word_id UUID REFERENCES words(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'view', 'mark_known', 'mark_vague', 'mark_unknown'
  practice_mode VARCHAR(50), -- 'dictation', 'match_game', 'flashcard'
  is_correct BOOLEAN,
  time_spent_seconds INTEGER,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_learning_records_user ON learning_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_records_book ON learning_records(book_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_word ON learning_records(word_id);

-- --------------------------------------------
-- mistakes: 错题本表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  wrong_count INTEGER DEFAULT 1,
  last_wrong_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word_id, book_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_mistakes_user ON mistakes(user_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_mistakes_word ON mistakes(word_id);

-- 业务逻辑：
-- - 当用户标记单词为"不认识"或"模糊"时，自动加入错题本
-- - 当单词状态变为"认识"时，is_resolved = true

-- --------------------------------------------
-- vocabulary_calendar: 生词日历表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS vocabulary_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'unknown', 'vague'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word_id, date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_vocabulary_calendar_user_date ON vocabulary_calendar(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_vocabulary_calendar_word ON vocabulary_calendar(word_id);

-- 用途：
-- - 生词日历热力图数据
-- - 按日期统计新增生词数量

-- ============================================
-- 自动添加到错题本的触发器
-- ============================================
CREATE OR REPLACE FUNCTION add_to_mistakes()
RETURNS TRIGGER AS $$
BEGIN
  -- 当状态为 'vague' 或 'unknown' 时，自动添加到错题本
  IF NEW.status IN ('vague', 'unknown') THEN
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_to_mistakes
AFTER INSERT OR UPDATE ON word_progress
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM COALESCE(OLD.status, 'new'))
EXECUTE FUNCTION add_to_mistakes();

-- ============================================
-- 生词日历自动记录触发器
-- ============================================
CREATE OR REPLACE FUNCTION add_to_vocabulary_calendar()
RETURNS TRIGGER AS $$
BEGIN
  -- 当状态为 'vague' 或 'unknown' 时，自动记录到生词日历
  IF NEW.status IN ('vague', 'unknown') THEN
    INSERT INTO vocabulary_calendar (user_id, word_id, book_id, date, status)
    VALUES (NEW.user_id, NEW.word_id, NEW.book_id, CURRENT_DATE, NEW.status)
    ON CONFLICT (user_id, word_id, date)
    DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_to_vocabulary_calendar
AFTER INSERT OR UPDATE ON word_progress
FOR EACH ROW
WHEN (NEW.status IN ('vague', 'unknown'))
EXECUTE FUNCTION add_to_vocabulary_calendar();

-- ============================================
-- 注释说明
-- ============================================

COMMENT ON TABLE users IS '用户表';
COMMENT ON TABLE invitation_codes IS '邀请码表';
COMMENT ON TABLE user_quotas IS '用户配额表（每日智能识别限制）';
COMMENT ON TABLE themes IS '主题表（如：商务、旅游、日常）';
COMMENT ON TABLE scenes IS '场景表（如：机场、酒店、餐厅）';
COMMENT ON TABLE books IS '单词书表';
COMMENT ON TABLE chapters IS '章节表';
COMMENT ON TABLE words IS '单词表';
COMMENT ON TABLE word_progress IS '单词学习进度表';
COMMENT ON TABLE learning_records IS '学习记录表';
COMMENT ON TABLE mistakes IS '错题本表';
COMMENT ON TABLE vocabulary_calendar IS '生词日历表';

COMMENT ON VIEW global_word_status IS '全局单词状态视图（用于跨词书状态同步）';
