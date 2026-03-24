-- 创建视频学习内容表 (修正版 v2)
-- 作者: Claude
-- 创建时间: 2026-03-23
-- 对应 PRD: VIDEO_BATCH_UPLOAD_PRD.md v1.2 Section 5.5-5.7
-- 对应 Tech: VIDEO_BATCH_UPLOAD_TECH.md Phase 4.1
-- 修复: 使用 videos.package_ids 替代已删除的 package_video_relations 表

-- ============================================
-- 1. 语法点表
-- ============================================

CREATE TABLE IF NOT EXISTS video_grammar_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  name VARCHAR(255) NOT NULL,
  structure TEXT,
  example_french TEXT,
  example_chinese TEXT,
  example_ipa VARCHAR(100),
  purpose TEXT,
  note TEXT,
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
COMMENT ON COLUMN video_grammar_points.display_order IS '显示顺序';

CREATE INDEX IF NOT EXISTS idx_grammar_points_video ON video_grammar_points(video_id);

-- ============================================
-- 2. 发音要点表
-- ============================================

CREATE TABLE IF NOT EXISTS video_pronunciation_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  sound_symbol VARCHAR(50) NOT NULL,
  example_words TEXT[],
  instruction TEXT,
  practice_tip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE video_pronunciation_tips IS '视频发音要点 - 存储关键发音教学';
COMMENT ON COLUMN video_pronunciation_tips.sound_symbol IS '音标符号';
COMMENT ON COLUMN video_pronunciation_tips.example_words IS '示例单词数组';
COMMENT ON COLUMN video_pronunciation_tips.instruction IS '发音指导';
COMMENT ON COLUMN video_pronunciation_tips.practice_tip IS '练习技巧';
COMMENT ON COLUMN video_pronunciation_tips.display_order IS '显示顺序';

CREATE INDEX IF NOT EXISTS idx_pronunciation_tips_video ON video_pronunciation_tips(video_id);

-- ============================================
-- 3. 词汇网络表
-- ============================================

CREATE TABLE IF NOT EXISTS video_vocabulary_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL UNIQUE REFERENCES videos(id) ON DELETE CASCADE,
  theme TEXT,
  structure TEXT,
  related_words TEXT[],
  collocations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE video_vocabulary_networks IS '视频词汇网络 - 存储词汇关联关系';
COMMENT ON COLUMN video_vocabulary_networks.theme IS '词汇主题';
COMMENT ON COLUMN video_vocabulary_networks.structure IS '词汇结构 (如JSON格式)';
COMMENT ON COLUMN video_vocabulary_networks.related_words IS '关联词汇数组';
COMMENT ON COLUMN video_vocabulary_networks.collocations IS '搭配示例';

CREATE INDEX IF NOT EXISTS idx_vocabulary_networks_video ON video_vocabulary_networks(video_id);

-- ============================================
-- 4. RLS 策略
-- ============================================

-- 启用 RLS
ALTER TABLE video_grammar_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_pronunciation_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_vocabulary_networks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4.1 用户读取策略：使用 videos.package_ids 检查权限
-- ============================================

CREATE POLICY "用户读取已购套餐的语法点"
  ON video_grammar_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN user_invitation_packages uip ON uip.package_id = ANY(v.package_ids)
      WHERE v.id = video_grammar_points.video_id
        AND uip.user_id = auth.uid()
        AND uip.is_active = true
        AND (uip.expires_at IS NULL OR uip.expires_at > NOW())
    )
  );

CREATE POLICY "用户读取已购套餐的发音要点"
  ON video_pronunciation_tips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN user_invitation_packages uip ON uip.package_id = ANY(v.package_ids)
      WHERE v.id = video_pronunciation_tips.video_id
        AND uip.user_id = auth.uid()
        AND uip.is_active = true
        AND (uip.expires_at IS NULL OR uip.expires_at > NOW())
    )
  );

CREATE POLICY "用户读取已购套餐的词汇网络"
  ON video_vocabulary_networks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN user_invitation_packages uip ON uip.package_id = ANY(v.package_ids)
      WHERE v.id = video_vocabulary_networks.video_id
        AND uip.user_id = auth.uid()
        AND uip.is_active = true
        AND (uip.expires_at IS NULL OR uip.expires_at > NOW())
    )
  );

-- ============================================
-- 4.2 service_role 完全访问
-- ============================================

CREATE POLICY "service_role 完全访问语法点"
  ON video_grammar_points FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role 完全访问发音要点"
  ON video_pronunciation_tips FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role 完全访问词汇网络"
  ON video_vocabulary_networks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4.3 管理员完全访问权限 (通过 user_roles 表)
-- ============================================

CREATE POLICY "管理员可以管理所有语法点"
  ON video_grammar_points FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "管理员可以管理所有发音要点"
  ON video_pronunciation_tips FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "管理员可以管理所有词汇网络"
  ON video_vocabulary_networks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );
