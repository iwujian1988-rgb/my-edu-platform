-- ============================================
-- 视频学习模块 - 数据库迁移
-- 版本: v1.0
-- 日期: 2026-03-17
-- 对应 PRD: VIDEO_MODULE_PRD.md v2.0
-- 对应 Tech: VIDEO_MODULE_TECH.md v5.0
-- ============================================

-- ============================================
-- Part 1: 视频套餐表（核心售卖逻辑）
-- ============================================

CREATE TABLE IF NOT EXISTS video_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  validity_days INTEGER DEFAULT 365,
  language VARCHAR(10),                  -- 主要语言（en/fr/de/es/ja/it/ru），NULL 表示多语言
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE video_packages IS '视频套餐表 - 定义售卖的套餐';
COMMENT ON COLUMN video_packages.language IS '套餐主要语言，NULL 表示多语言套餐';

CREATE INDEX IF NOT EXISTS idx_video_packages_active ON video_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_video_packages_language ON video_packages(language);

-- ============================================
-- Part 2: 视频表（添加多语言支持）
-- ============================================

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  language VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'fr', 'de', 'es', 'ja', 'it', 'ru')),
  difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  display_order INTEGER DEFAULT 0,
  creator_name VARCHAR(100),
  source_url TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE videos IS '视频内容表';
COMMENT ON COLUMN videos.language IS '视频语言，每个视频只关联一个语言';
COMMENT ON COLUMN videos.difficulty IS '难度等级: beginner=入门, intermediate=进阶, advanced=难';

CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_difficulty ON videos(difficulty);
CREATE INDEX IF NOT EXISTS idx_videos_order ON videos(display_order);
CREATE INDEX IF NOT EXISTS idx_videos_language ON videos(language);

-- ============================================
-- Part 3: 套餐-视频关联表
-- ============================================

CREATE TABLE IF NOT EXISTS package_video_relations (
  package_id UUID REFERENCES video_packages(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (package_id, video_id)
);

COMMENT ON TABLE package_video_relations IS '套餐-视频关联表，实现灵活的售卖逻辑';

CREATE INDEX IF NOT EXISTS idx_pvr_package ON package_video_relations(package_id);
CREATE INDEX IF NOT EXISTS idx_pvr_video ON package_video_relations(video_id);

-- ============================================
-- Part 4: 用户-视频套餐关联表
-- ============================================

CREATE TABLE IF NOT EXISTS user_video_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  package_id UUID REFERENCES video_packages(id) ON DELETE CASCADE,
  invitation_code_id UUID,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, package_id)
);

COMMENT ON TABLE user_video_packages IS '用户购买的套餐记录';
COMMENT ON COLUMN user_video_packages.expires_at IS '过期时间，NULL 表示永久有效';

CREATE INDEX IF NOT EXISTS idx_user_video_packages_user ON user_video_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_video_packages_expires ON user_video_packages(user_id, expires_at);

-- ============================================
-- Part 5: 视频标签表
-- ============================================

CREATE TABLE IF NOT EXISTS video_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(20) DEFAULT 'topic' CHECK (type IN ('topic', 'creator', 'difficulty', 'duration')),
  color VARCHAR(20) DEFAULT '#3B82F6',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_tag_relations (
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES video_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_video_tag_relations_tag ON video_tag_relations(tag_id);

-- ============================================
-- Part 6: 字幕表
-- ============================================

CREATE TABLE IF NOT EXISTS video_subtitles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  start_time DECIMAL(10,3) NOT NULL,
  end_time DECIMAL(10,3) NOT NULL,
  original_text TEXT NOT NULL,           -- 原语言文本（根据视频语言）
  chinese_text TEXT,
  word_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN video_subtitles.original_text IS '原语言文本，根据视频语言可能是英语/法语/德语等';

CREATE INDEX IF NOT EXISTS idx_subtitles_video ON video_subtitles(video_id, start_time);
CREATE INDEX IF NOT EXISTS idx_subtitles_order ON video_subtitles(video_id, display_order);

-- ============================================
-- Part 7: 单词卡片
-- ============================================

CREATE TABLE IF NOT EXISTS video_word_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  word VARCHAR(100) NOT NULL,
  phonetic VARCHAR(100),
  part_of_speech VARCHAR(20),
  chinese_definition TEXT NOT NULL,
  english_definition TEXT,
  example_from_video TEXT,
  example_translation TEXT,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_word_cards_video ON video_word_cards(video_id);
CREATE INDEX IF NOT EXISTS idx_word_cards_word ON video_word_cards(word);

-- ============================================
-- Part 8: 短语卡片
-- ============================================

CREATE TABLE IF NOT EXISTS video_phrase_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  phrase VARCHAR(255) NOT NULL,
  phonetic VARCHAR(100),
  chinese_definition TEXT NOT NULL,
  synonyms TEXT,
  context TEXT,
  context_translation TEXT,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phrase_cards_video ON video_phrase_cards(video_id);

-- ============================================
-- Part 9: 地道表达卡片（核心差异化）
-- ============================================

CREATE TABLE IF NOT EXISTS video_expression_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  expression VARCHAR(255) NOT NULL,
  context TEXT NOT NULL,
  context_translation TEXT,
  formula TEXT,
  meaning TEXT,
  usage_note TEXT,
  examples JSONB,
  scenarios TEXT,
  similar_expressions TEXT[],
  formality_level VARCHAR(20) DEFAULT 'neutral' CHECK (formality_level IN ('neutral', 'formal', 'informal')),
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN video_expression_cards.examples IS '[{original, cn}, {original, cn}] 原语言例句+中文翻译';

CREATE INDEX IF NOT EXISTS idx_expression_cards_video ON video_expression_cards(video_id);

-- ============================================
-- Part 10: 填空练习表
-- ============================================

CREATE TABLE IF NOT EXISTS video_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  subtitle_id UUID REFERENCES video_subtitles(id) ON DELETE CASCADE,
  exercise_type VARCHAR(20) NOT NULL CHECK (exercise_type IN ('fill_blank', 'dictation')),
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  original_text TEXT NOT NULL,
  blank_positions JSONB NOT NULL,
  hint_type VARCHAR(20),
  answer_text TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN video_exercises.blank_positions IS '[{start, end, word, hint}] 挖空位置信息';
COMMENT ON COLUMN video_exercises.hint_type IS 'first_letter | first_last_letter | none';
COMMENT ON COLUMN video_exercises.difficulty IS 'beginner: 挖1词, intermediate: 挖2-3词, advanced: 整句听写';

CREATE INDEX IF NOT EXISTS idx_exercises_video ON video_exercises(video_id);
CREATE INDEX IF NOT EXISTS idx_exercises_subtitle ON video_exercises(subtitle_id);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON video_exercises(difficulty);

-- ============================================
-- Part 11: 难度分析表（AI评估结果）
-- ============================================

CREATE TABLE IF NOT EXISTS video_difficulty_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE UNIQUE,
  vocabulary_score DECIMAL(3,1),
  speech_rate DECIMAL(6,2),
  sentence_complexity DECIMAL(3,1),
  idiom_density DECIMAL(3,2),
  final_difficulty VARCHAR(20) NOT NULL CHECK (final_difficulty IN ('beginner', 'intermediate', 'advanced')),
  analysis_reason TEXT,
  total_words INTEGER DEFAULT 0,
  total_sentences INTEGER DEFAULT 0,
  avg_sentence_length DECIMAL(5,2),
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  model_version VARCHAR(50)
);

COMMENT ON COLUMN video_difficulty_analysis.vocabulary_score IS '词汇难度 1-10';
COMMENT ON COLUMN video_difficulty_analysis.speech_rate IS '语速（词/分钟）';
COMMENT ON COLUMN video_difficulty_analysis.sentence_complexity IS '句子复杂度 1-10';

CREATE INDEX IF NOT EXISTS idx_difficulty_analysis_video ON video_difficulty_analysis(video_id);
CREATE INDEX IF NOT EXISTS idx_difficulty_analysis_level ON video_difficulty_analysis(final_difficulty);

-- ============================================
-- Part 12: 字幕-卡片关联表（用于字幕高亮）
-- ============================================

CREATE TABLE IF NOT EXISTS subtitle_card_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtitle_id UUID REFERENCES video_subtitles(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('word', 'phrase', 'expression')),
  card_id UUID NOT NULL,
  start_position INTEGER NOT NULL,
  end_position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subtitle_id, card_type, card_id)
);

CREATE INDEX IF NOT EXISTS idx_subtitle_card_subtitle ON subtitle_card_relations(subtitle_id);
CREATE INDEX IF NOT EXISTS idx_subtitle_card_card ON subtitle_card_relations(card_type, card_id);
CREATE INDEX IF NOT EXISTS idx_subtitle_card_positions ON subtitle_card_relations(subtitle_id, start_position, end_position);

-- ============================================
-- Part 13: 视频观看进度
-- ============================================

CREATE TABLE IF NOT EXISTS user_video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  last_position DECIMAL(10,3) DEFAULT 0,
  watch_duration INTEGER DEFAULT 0,
  max_progress DECIMAL(5,2) DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_user_video_progress_user ON user_video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_video_progress_video ON user_video_progress(video_id);

-- ============================================
-- Part 14: 卡片掌握状态
-- ============================================

CREATE TABLE IF NOT EXISTS user_card_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('word', 'phrase', 'expression')),
  card_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('known', 'unknown', 'learning')),
  review_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  ease_factor DECIMAL(3,2) DEFAULT 2.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_type, card_id)
);

COMMENT ON COLUMN user_card_progress.ease_factor IS 'SM-2 算法因子，用于艾宾浩斯遗忘曲线';

CREATE INDEX IF NOT EXISTS idx_user_card_progress_user ON user_card_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_card_progress_review ON user_card_progress(user_id, next_review_at);

-- ============================================
-- Part 15: 录音表
-- ============================================

CREATE TABLE IF NOT EXISTS user_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  subtitle_id UUID REFERENCES video_subtitles(id) ON DELETE SET NULL,
  recording_url TEXT NOT NULL,
  duration DECIMAL(10,3),
  file_size INTEGER,
  content_type VARCHAR(50) DEFAULT 'audio/webm',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_recordings_user ON user_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recordings_video ON user_recordings(video_id);

-- ============================================
-- Part 16: 收藏表
-- ============================================

CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('subtitle', 'word_card', 'phrase_card', 'expression_card')),
  item_id UUID NOT NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_video ON user_favorites(video_id);

-- ============================================
-- Part 17: 视频学习日历
-- ============================================

CREATE TABLE IF NOT EXISTS video_learning_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  learning_date DATE NOT NULL,
  video_count INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  cards_reviewed INTEGER DEFAULT 0,
  recordings_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, learning_date)
);

CREATE INDEX IF NOT EXISTS idx_video_calendar_user ON video_learning_calendar(user_id);
CREATE INDEX IF NOT EXISTS idx_video_calendar_date ON video_learning_calendar(learning_date);

-- ============================================
-- Part 18: RLS 策略
-- ============================================

-- 启用 RLS
ALTER TABLE video_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_video_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_video_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_subtitles ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_word_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_phrase_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_expression_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_difficulty_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitle_card_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_card_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_learning_calendar ENABLE ROW LEVEL SECURITY;

-- 公开读取策略（已发布的视频、套餐等）
CREATE POLICY "公开读取已发布视频" ON videos FOR SELECT USING (status = 'published');
CREATE POLICY "公开读取激活套餐" ON video_packages FOR SELECT USING (is_active = true);
CREATE POLICY "公开读取标签" ON video_tags FOR SELECT USING (true);
CREATE POLICY "公开读取视频标签关联" ON video_tag_relations FOR SELECT USING (true);

-- 用户只能读取自己有权访问的视频的详细数据
CREATE POLICY "用户读取已购套餐的视频数据" ON video_subtitles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN package_video_relations pvr ON pvr.video_id = v.id
      JOIN user_video_packages uvp ON uvp.package_id = pvr.package_id
      WHERE v.id = video_subtitles.video_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

CREATE POLICY "用户读取已购套餐的卡片数据" ON video_word_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN package_video_relations pvr ON pvr.video_id = v.id
      JOIN user_video_packages uvp ON uvp.package_id = pvr.package_id
      WHERE v.id = video_word_cards.video_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

CREATE POLICY "用户读取已购套餐的短语卡片" ON video_phrase_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN package_video_relations pvr ON pvr.video_id = v.id
      JOIN user_video_packages uvp ON uvp.package_id = pvr.package_id
      WHERE v.id = video_phrase_cards.video_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

CREATE POLICY "用户读取已购套餐的表达卡片" ON video_expression_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN package_video_relations pvr ON pvr.video_id = v.id
      JOIN user_video_packages uvp ON uvp.package_id = pvr.package_id
      WHERE v.id = video_expression_cards.video_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

CREATE POLICY "用户读取已购套餐的练习" ON video_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN package_video_relations pvr ON pvr.video_id = v.id
      JOIN user_video_packages uvp ON uvp.package_id = pvr.package_id
      WHERE v.id = video_exercises.video_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

CREATE POLICY "用户读取已购套餐的难度分析" ON video_difficulty_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN package_video_relations pvr ON pvr.video_id = v.id
      JOIN user_video_packages uvp ON uvp.package_id = pvr.package_id
      WHERE v.id = video_difficulty_analysis.video_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

CREATE POLICY "用户读取已购套餐的卡片关联" ON subtitle_card_relations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_subtitles vs
      JOIN videos v ON v.id = vs.video_id
      JOIN package_video_relations pvr ON pvr.video_id = v.id
      JOIN user_video_packages uvp ON uvp.package_id = pvr.package_id
      WHERE vs.id = subtitle_card_relations.subtitle_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

CREATE POLICY "用户读取已购套餐的关联" ON package_video_relations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_video_packages uvp
      WHERE uvp.package_id = package_video_relations.package_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

-- 用户自己的数据
CREATE POLICY "用户读取自己的套餐" ON user_video_packages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "用户读取自己的进度" ON user_video_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "用户读取自己的卡片进度" ON user_card_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "用户读取自己的录音" ON user_recordings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "用户读取自己的收藏" ON user_favorites FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "用户读取自己的日历" ON video_learning_calendar FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "用户管理自己的进度" ON user_video_progress FOR ALL USING (user_id = auth.uid());
CREATE POLICY "用户管理自己的卡片进度" ON user_card_progress FOR ALL USING (user_id = auth.uid());
CREATE POLICY "用户管理自己的录音" ON user_recordings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "用户管理自己的收藏" ON user_favorites FOR ALL USING (user_id = auth.uid());
CREATE POLICY "用户管理自己的日历" ON video_learning_calendar FOR ALL USING (user_id = auth.uid());

-- ============================================
-- Part 19: 触发器 - 自动更新 updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_packages_updated_at
  BEFORE UPDATE ON video_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_card_progress_updated_at
  BEFORE UPDATE ON user_card_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_video_progress_updated_at
  BEFORE UPDATE ON user_video_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Part 20: 常用视图
-- ============================================

-- 用户可访问的视频列表视图
CREATE OR REPLACE VIEW user_accessible_videos AS
SELECT DISTINCT
  v.*,
  vp.name as package_name
FROM videos v
JOIN package_video_relations pvr ON pvr.video_id = v.id
JOIN video_packages vp ON vp.id = pvr.package_id
JOIN user_video_packages uvp ON uvp.package_id = vp.id
WHERE uvp.is_active = true
  AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
  AND v.status = 'published';

COMMENT ON VIEW user_accessible_videos IS '用户可访问的视频列表视图';

-- ============================================
-- Part 21: 管理员权限 - 使用 service_role
-- 注意：管理员操作需要通过 service_role key 的 API 调用
-- ============================================

-- 为管理员创建绕过 RLS 的策略（仅限 service_role）
CREATE POLICY "service_role 完全访问" ON video_packages FOR ALL TO service_role USING (true);
CREATE POLICY "service_role 完全访问" ON videos FOR ALL TO service_role USING (true);
CREATE POLICY "service_role 完全访问" ON package_video_relations FOR ALL TO service_role USING (true);
CREATE POLICY "service_role 完全访问" ON video_tags FOR ALL TO service_role USING (true);
CREATE POLICY "service_role 完全访问" ON video_tag_relations FOR ALL TO service_role USING (true);
CREATE POLICY "service_role 完全访问" ON video_subtitles FOR ALL TO service_role USING (true);
CREATE POLICY "service_role 完全访问" ON video_word_cards FOR ALL TO service_role USING (true);
CREATE POLICY "service_role 完全访问" ON video_phrase_cards FOR ALL TO service_role USING (true);
CREATE POLICY "service_role 完全访问" ON video_expression_cards FOR ALL TO service_role USING (true);
CREATE POLICY "service_role 完全访问" ON video_exercises FOR ALL TO service_role USING (true);
CREATE POLICY "service_role 完全访问" ON video_difficulty_analysis FOR ALL TO service_role USING (true);
CREATE POLICY "service_role 完全访问" ON subtitle_card_relations FOR ALL TO service_role USING (true);

-- ============================================
-- 完成
-- ============================================
