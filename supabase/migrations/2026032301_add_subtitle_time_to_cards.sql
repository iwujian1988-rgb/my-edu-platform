-- ============================================
-- 添加字幕时间字段到卡片表
--
-- 对应 PRD: VIDEO_BATCH_UPLOAD_PRD.md Section 5.9
-- - 点击 [📍] 跳转到字幕中该单词首次出现的位置
-- - 点击 [▶ 播放这段] 视频跳转到该例句位置并播放
--
-- 版本: v1.0
-- 日期: 2026-03-23
-- ============================================

-- ============================================
-- Part 1: video_word_cards 添加字幕时间
-- ============================================

ALTER TABLE video_word_cards
ADD COLUMN IF NOT EXISTS subtitle_start_time NUMERIC(10, 3) DEFAULT 0;

COMMENT ON COLUMN video_word_cards.subtitle_start_time IS '单词在字幕中首次出现的时间（秒），用于 [📍] 跳转播放';

-- ============================================
-- Part 2: video_expression_cards 添加字幕时间
-- ============================================

ALTER TABLE video_expression_cards
ADD COLUMN IF NOT EXISTS subtitle_start_time NUMERIC(10, 3) DEFAULT 0;

COMMENT ON COLUMN video_expression_cards.subtitle_start_time IS '表达在字幕中首次出现的时间（秒），用于 [▶ 播放这段] 跳转播放';

-- ============================================
-- 完成
-- ============================================
