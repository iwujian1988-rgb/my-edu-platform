-- ============================================
-- 卡片审核状态字段
-- 版本: v1.0
-- 日期: 2026-03-18
-- 对应 PRD: VIDEO_MODULE_PRD.md Section 5.11
-- ============================================

-- 为三种卡片表添加审核状态字段
ALTER TABLE video_word_cards
  ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID;

ALTER TABLE video_phrase_cards
  ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID;

ALTER TABLE video_expression_cards
  ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID;

-- 添加索引加速查询
CREATE INDEX IF NOT EXISTS idx_word_cards_reviewed ON video_word_cards(is_reviewed);
CREATE INDEX IF NOT EXISTS idx_phrase_cards_reviewed ON video_phrase_cards(is_reviewed);
CREATE INDEX IF NOT EXISTS idx_expression_cards_reviewed ON video_expression_cards(is_reviewed);

-- 添加注释
COMMENT ON COLUMN video_word_cards.is_reviewed IS '是否已通过审核，未审核的卡片不展示给用户';
COMMENT ON COLUMN video_phrase_cards.is_reviewed IS '是否已通过审核，未审核的卡片不展示给用户';
COMMENT ON COLUMN video_expression_cards.is_reviewed IS '是否已通过审核，未审核的卡片不展示给用户';

-- ============================================
-- 完成
-- ============================================
