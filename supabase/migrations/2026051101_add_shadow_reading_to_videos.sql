-- 在 videos 表添加 shadow_reading 字段，存储影子跟读精选句 + 逐词时间戳
ALTER TABLE videos ADD COLUMN IF NOT EXISTS shadow_reading JSONB;
COMMENT ON COLUMN videos.shadow_reading IS '影子跟读数据：精选句子列表 + 逐词级时间戳（来自字幕JSON的shadow_reading字段）';
