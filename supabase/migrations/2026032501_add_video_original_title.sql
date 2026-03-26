-- 添加视频原文标题字段
-- 用于存储视频的原语言标题（如法语标题），与中文标题区分

ALTER TABLE videos
ADD COLUMN IF NOT EXISTS original_title VARCHAR(255);

COMMENT ON COLUMN videos.original_title IS '视频原语言标题（如法语、英语等），title 字段存储中文标题';

-- 为现有数据设置默认值（可选，将 title 复制到 original_title）
-- UPDATE videos SET original_title = title WHERE original_title IS NULL;
