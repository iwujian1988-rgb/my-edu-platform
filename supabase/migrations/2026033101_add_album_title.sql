-- 新增专辑名称字段
-- 导入时从 unit_info.video_title_cn 映射而来
ALTER TABLE videos ADD COLUMN IF NOT EXISTS album_title VARCHAR(255);

COMMENT ON COLUMN videos.album_title IS '专辑名称，来自导入 JSON 的 video_title_cn 字段';
