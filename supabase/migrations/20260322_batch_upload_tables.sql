-- ============================================
-- 批量上传功能 - 数据库迁移
-- 版本: v1.0
-- 日期: 2026-03-22
-- 对应 PRD: VIDEO_BATCH_UPLOAD_PRD.md v1.2
-- 对应 Tech: VIDEO_BATCH_UPLOAD_TECH.md v1.0
-- ============================================

-- ============================================
-- Part 1: 语法点表 (video_grammar_points)
-- ============================================

CREATE TABLE IF NOT EXISTS video_grammar_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  structure TEXT,
  example_french TEXT,
  example_chinese TEXT,
  example_ipa VARCHAR(100),
  purpose TEXT,
  note TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE video_grammar_points IS '视频语法点 - 存储每个视频的语法教学点';
COMMENT ON COLUMN video_grammar_points.name IS '语法点名称';
COMMENT ON COLUMN video_grammar_points.structure IS '语法结构/公式';
COMMENT ON COLUMN video_grammar_points.example_french IS '法语例句';
COMMENT ON COLUMN video_grammar_points.example_chinese IS '中文翻译';
COMMENT ON COLUMN video_grammar_points.example_ipa IS '国际音标';
COMMENT ON COLUMN video_grammar_points.purpose IS '用途说明';
COMMENT ON COLUMN video_grammar_points.note IS '注意事项';

CREATE INDEX IF NOT EXISTS idx_grammar_points_video ON video_grammar_points(video_id);
CREATE INDEX IF NOT EXISTS idx_grammar_points_order ON video_grammar_points(video_id, display_order);

-- ============================================
-- Part 2: 发音要点表 (video_pronunciation_tips)
-- ============================================

CREATE TABLE IF NOT EXISTS video_pronunciation_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  sound_symbol VARCHAR(50) NOT NULL,
  example_words TEXT[],
  instruction TEXT,
  practice_tip TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE video_pronunciation_tips IS '视频发音要点 - 存储关键发音教学';
COMMENT ON COLUMN video_pronunciation_tips.sound_symbol IS '音标符号';
COMMENT ON COLUMN video_pronunciation_tips.example_words IS '示例单词数组';
COMMENT ON COLUMN video_pronunciation_tips.instruction IS '发音指导';
COMMENT ON COLUMN video_pronunciation_tips.practice_tip IS '练习技巧';

CREATE INDEX IF NOT EXISTS idx_pronunciation_tips_video ON video_pronunciation_tips(video_id);
CREATE INDEX IF NOT EXISTS idx_pronunciation_tips_order ON video_pronunciation_tips(video_id, display_order);

-- ============================================
-- Part 3: 词汇网络表 (video_vocabulary_networks)
-- ============================================

CREATE TABLE IF NOT EXISTS video_vocabulary_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme VARCHAR(255),
  structure TEXT,
  related_words TEXT[],
  collocations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE video_vocabulary_networks IS '视频词汇网络 - 存储词汇关联关系';
COMMENT ON COLUMN video_vocabulary_networks.theme IS '词汇主题';
COMMENT ON COLUMN video_vocabulary_networks.structure IS '词汇结构 (JSON)';
COMMENT ON COLUMN video_vocabulary_networks.related_words IS '相关词汇数组';
COMMENT ON COLUMN video_vocabulary_networks.collocations IS '常见搭配';

CREATE INDEX IF NOT EXISTS idx_vocabulary_networks_video ON video_vocabulary_networks(video_id);

-- ============================================
-- Part 4: RLS 策略
-- ============================================

-- 启用 RLS
ALTER TABLE video_grammar_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_pronunciation_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_vocabulary_networks ENABLE ROW LEVEL SECURITY;

-- 用户读取策略：需要已购套餐权限
CREATE POLICY "用户读取已购套餐的语法点" ON video_grammar_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN package_video_relations pvr ON pvr.video_id = v.id
      JOIN user_video_packages uvp ON uvp.package_id = pvr.package_id
      WHERE v.id = video_grammar_points.video_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

CREATE POLICY "用户读取已购套餐的发音要点" ON video_pronunciation_tips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN package_video_relations pvr ON pvr.video_id = v.id
      JOIN user_video_packages uvp ON uvp.package_id = pvr.package_id
      WHERE v.id = video_pronunciation_tips.video_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

CREATE POLICY "用户读取已购套餐的词汇网络" ON video_vocabulary_networks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN package_video_relations pvr ON pvr.video_id = v.id
      JOIN user_video_packages uvp ON uvp.package_id = pvr.package_id
      WHERE v.id = video_vocabulary_networks.video_id
        AND uvp.user_id = auth.uid()
        AND uvp.is_active = true
        AND (uvp.expires_at IS NULL OR uvp.expires_at > NOW())
    )
  );

-- service_role 完全访问策略
CREATE POLICY "service_role 完全访问语法点" ON video_grammar_points FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role 完全访问发音要点" ON video_pronunciation_tips FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role 完全访问词汇网络" ON video_vocabulary_networks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- Part 5: 触发器 - 自动更新 updated_at
-- ============================================

-- 复用已有的 update_updated_at_column 函数，无需重新创建

-- ============================================
-- 完成
-- ============================================
