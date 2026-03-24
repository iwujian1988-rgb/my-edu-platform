-- ============================================
-- 添加字幕结束时间字段到卡片表
--
-- 根据字幕的 start_time 和下一个字幕的 start_time 计算结束时间
-- ============================================

-- Part 1: 添加字段
ALTER TABLE video_word_cards
ADD COLUMN IF NOT EXISTS subtitle_end_time NUMERIC(10, 3);

ALTER TABLE video_expression_cards
ADD COLUMN IF NOT EXISTS subtitle_end_time NUMERIC(10, 3);

-- Part 2: 更新现有数据 - 根据字幕计算结束时间
-- 单词卡片：根据 subtitle_start_time 找到对应字幕的 end_time
UPDATE video_word_cards vwc
SET subtitle_end_time = (
  SELECT vs.end_time
  FROM video_subtitles vs
  WHERE vs.video_id = vwc.video_id
    AND vs.start_time <= vwc.subtitle_start_time
    AND vs.end_time > vwc.subtitle_start_time
  LIMIT 1
)
WHERE subtitle_start_time IS NOT NULL
  AND subtitle_end_time IS NULL;

-- 表达卡片：同理
UPDATE video_expression_cards vec
SET subtitle_end_time = (
  SELECT vs.end_time
  FROM video_subtitles vs
  WHERE vs.video_id = vec.video_id
    AND vs.start_time <= vec.subtitle_start_time
    AND vs.end_time > vec.subtitle_start_time
  LIMIT 1
)
WHERE subtitle_start_time IS NOT NULL
  AND subtitle_end_time IS NULL;

-- Part 3: 添加注释
COMMENT ON COLUMN video_word_cards.subtitle_end_time IS '单词所在字幕的结束时间（秒），用于播放片段后自动暂停';
COMMENT ON COLUMN video_expression_cards.subtitle_end_time IS '表达所在字幕的结束时间（秒），用于播放片段后自动暂停';

-- ============================================
-- 完成
-- ============================================
