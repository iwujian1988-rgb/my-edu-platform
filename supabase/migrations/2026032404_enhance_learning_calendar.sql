-- ============================================
-- 增强学习日历表 - 支持细分的卡片类型统计
-- 版本: v1.1
-- 日期: 2026-03-24
-- ============================================

-- 添加新的字段：单词、词组、地道用法的标记数量
ALTER TABLE video_learning_calendar
ADD COLUMN IF NOT EXISTS words_marked INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS phrases_marked INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS expressions_marked INTEGER DEFAULT 0;

-- 添加观看的视频ID列表
ALTER TABLE video_learning_calendar
ADD COLUMN IF NOT EXISTS video_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN video_learning_calendar.words_marked IS '当天标记的单词数量';
COMMENT ON COLUMN video_learning_calendar.phrases_marked IS '当天标记的词组数量';
COMMENT ON COLUMN video_learning_calendar.expressions_marked IS '当天标记的地道用法数量';
COMMENT ON COLUMN video_learning_calendar.video_ids IS '当天观看的视频ID列表';

-- 创建索引加速按月查询
CREATE INDEX IF NOT EXISTS idx_video_calendar_user_month ON video_learning_calendar(user_id, learning_date);
