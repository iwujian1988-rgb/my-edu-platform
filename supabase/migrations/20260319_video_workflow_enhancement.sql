-- ============================================
-- 视频工作流增强迁移
-- 版本: v1.1
-- 日期: 2026-03-19
-- 功能:
--   1. video_url 允许 NULL（支持先上传字幕）
--   2. 新增 workflow_progress 工作流状态字段
--   3. 新增 video_preset_keywords 预设关键词表
--   4. 新增 is_reviewed 字段到卡片表
-- ============================================

-- ============================================
-- Part 1: video_url 允许 NULL
-- ============================================

ALTER TABLE videos ALTER COLUMN video_url DROP NOT NULL;
ALTER TABLE videos ALTER COLUMN video_url SET DEFAULT NULL;

COMMENT ON COLUMN videos.video_url IS '视频文件 URL，可在工作流最后上传';

-- ============================================
-- Part 2: 工作流进度字段
-- ============================================

ALTER TABLE videos
ADD COLUMN IF NOT EXISTS workflow_progress JSONB DEFAULT '{
  "current_step": 0,
  "steps": {
    "subtitles": "pending",
    "info": "pending",
    "translation": "pending",
    "cards": "pending",
    "review": "pending",
    "video": "pending",
    "publish": "pending"
  }
}'::jsonb;

COMMENT ON COLUMN videos.workflow_progress IS '工作流进度状态，包含 current_step (0-6) 和各步骤状态 (pending/in_progress/completed/skipped)';

-- ============================================
-- Part 3: 卡片审核字段（如果不存在则添加）
-- ============================================

-- 单词卡片
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_word_cards' AND column_name = 'is_reviewed'
  ) THEN
    ALTER TABLE video_word_cards ADD COLUMN is_reviewed BOOLEAN DEFAULT false;
    ALTER TABLE video_word_cards ADD COLUMN reviewed_at TIMESTAMPTZ;
    ALTER TABLE video_word_cards ADD COLUMN reviewed_by UUID;
  END IF;
END $$;

-- 短语卡片
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_phrase_cards' AND column_name = 'is_reviewed'
  ) THEN
    ALTER TABLE video_phrase_cards ADD COLUMN is_reviewed BOOLEAN DEFAULT false;
    ALTER TABLE video_phrase_cards ADD COLUMN reviewed_at TIMESTAMPTZ;
    ALTER TABLE video_phrase_cards ADD COLUMN reviewed_by UUID;
  END IF;
END $$;

-- 地道表达卡片
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_expression_cards' AND column_name = 'is_reviewed'
  ) THEN
    ALTER TABLE video_expression_cards ADD COLUMN is_reviewed BOOLEAN DEFAULT false;
    ALTER TABLE video_expression_cards ADD COLUMN reviewed_at TIMESTAMPTZ;
    ALTER TABLE video_expression_cards ADD COLUMN reviewed_by UUID;
  END IF;
END $$;

-- 填空练习
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_exercises' AND column_name = 'is_reviewed'
  ) THEN
    ALTER TABLE video_exercises ADD COLUMN is_reviewed BOOLEAN DEFAULT false;
    ALTER TABLE video_exercises ADD COLUMN reviewed_at TIMESTAMPTZ;
    ALTER TABLE video_exercises ADD COLUMN reviewed_by UUID;
  END IF;
END $$;

-- ============================================
-- Part 4: 预设关键词表
-- ============================================

CREATE TABLE IF NOT EXISTS video_preset_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) DEFAULT 'topic',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE video_preset_keywords IS '预设关键词库，用于字幕上传时自动匹配';
COMMENT ON COLUMN video_preset_keywords.category IS '关键词分类: topic/creator/difficulty/duration';
COMMENT ON COLUMN video_preset_keywords.usage_count IS '被匹配使用的次数';

CREATE INDEX IF NOT EXISTS idx_preset_keywords_keyword ON video_preset_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_preset_keywords_category ON video_preset_keywords(category);

-- ============================================
-- Part 5: 初始化预设关键词
-- ============================================

INSERT INTO video_preset_keywords (keyword, category) VALUES
-- 主题分类
('美食', 'topic'),
('旅行', 'topic'),
('职场', 'topic'),
('日常', 'topic'),
('口语', 'topic'),
('听力', 'topic'),
('新闻', 'topic'),
('科技', 'topic'),
('文化', 'topic'),
('教育', 'topic'),
('娱乐', 'topic'),
('运动', 'topic'),
('健康', 'topic'),
('音乐', 'topic'),
('电影', 'topic'),
('游戏', 'topic'),
('历史', 'topic'),
('自然', 'topic'),
('环境', 'topic'),
('商业', 'topic'),
-- 难度相关
('入门', 'difficulty'),
('基础', 'difficulty'),
('进阶', 'difficulty'),
('高级', 'difficulty'),
('专业', 'difficulty'),
-- 时长相关
('短视频', 'duration'),
('中等长度', 'duration'),
('长视频', 'duration')
ON CONFLICT (keyword) DO NOTHING;

-- ============================================
-- Part 6: RLS 策略
-- ============================================

ALTER TABLE video_preset_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读取预设关键词" ON video_preset_keywords FOR SELECT USING (true);
CREATE POLICY "service_role 完全访问" ON video_preset_keywords FOR ALL TO service_role USING (true);

-- ============================================
-- 完成
-- ============================================
