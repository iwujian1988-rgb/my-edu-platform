-- 添加视频"学习归属时间"字段
-- 用于前台视频列表排序

ALTER TABLE videos
ADD COLUMN IF NOT EXISTS learning_date DATE;

-- 添加注释
COMMENT ON COLUMN videos.learning_date IS '学习归属时间，用于前台视频列表排序';

-- 创建索引以优化排序查询
CREATE INDEX IF NOT EXISTS idx_videos_learning_date ON videos(learning_date DESC NULLS LAST);

-- 更新已有数据：将 published_at 日期作为默认的 learning_date
UPDATE videos
SET learning_date = DATE(published_at)
WHERE learning_date IS NULL AND published_at IS NOT NULL;
