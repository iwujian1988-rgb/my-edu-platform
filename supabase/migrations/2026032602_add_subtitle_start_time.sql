-- 添加 subtitle_start_time 列到 video_exercises 表
-- 用于存储练习对应的字幕开始时间，方便播放按钮跳转

ALTER TABLE video_exercises
ADD COLUMN IF NOT EXISTS subtitle_start_time NUMERIC DEFAULT NULL;

-- 添加注释
COMMENT ON COLUMN video_exercises.subtitle_start_time IS '字幕开始时间（秒），用于 [播放] 按钮跳转视频';
