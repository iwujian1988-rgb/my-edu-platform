-- 音频博客扩展：videos 表加 content_type 和 cover_url 字段
-- content_type: 区分 'video'（视频）和 'audio'（音频博客）
-- cover_url: 音频博客的封面图 URL（视频类型仍使用 thumbnail_url）

-- 1. 添加 content_type 字段，默认 'video'（已有数据兼容）
ALTER TABLE videos ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) DEFAULT 'video';

-- 2. 添加 cover_url 字段（音频博客封面图）
ALTER TABLE videos ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- 3. 更新分页函数，增加 p_content_type 筛选参数，返回 content_type 和 cover_url
CREATE OR REPLACE FUNCTION get_published_videos_paginated(
  p_limit INT DEFAULT 12,
  p_offset INT DEFAULT 0,
  p_language VARCHAR DEFAULT NULL,
  p_difficulty VARCHAR DEFAULT NULL,
  p_tag_ids UUID[] DEFAULT NULL,
  p_learned_video_ids UUID[] DEFAULT NULL,
  p_learn_status VARCHAR DEFAULT 'all',
  p_package_ids UUID[] DEFAULT NULL,
  p_has_permission BOOLEAN DEFAULT FALSE,
  p_today DATE DEFAULT CURRENT_DATE,
  p_content_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  duration INT,
  language VARCHAR,
  difficulty VARCHAR,
  content_type VARCHAR,
  cover_url TEXT,
  status VARCHAR,
  display_order INT,
  creator_name VARCHAR,
  source_url TEXT,
  view_count INT,
  learning_date DATE,
  created_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  package_ids UUID[],
  tag_names VARCHAR[],
  total_count BIGINT
) AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- 先算总数
  SELECT COUNT(*) INTO v_total
  FROM videos v
  WHERE v.status = 'published'
    AND (v.learning_date IS NULL OR v.learning_date <= p_today)
    AND (p_language IS NULL OR v.language = p_language)
    AND (p_difficulty IS NULL OR v.difficulty = p_difficulty)
    AND (p_tag_ids IS NULL OR EXISTS (
      SELECT 1 FROM video_tag_relations vtr
      WHERE vtr.video_id = v.id AND vtr.tag_id = ANY(p_tag_ids)
    ))
    AND (p_learn_status = 'all'
         OR (p_learn_status = 'learned' AND v.id = ANY(p_learned_video_ids))
         OR (p_learn_status = 'unlearned' AND (p_learned_video_ids IS NULL OR NOT (v.id = ANY(p_learned_video_ids))))
    )
    AND (p_has_permission = TRUE
         OR p_package_ids IS NULL
         OR v.package_ids = '{}'
         OR v.package_ids && p_package_ids
    )
    AND (p_content_type IS NULL OR v.content_type = p_content_type);

  -- 返回分页数据，按 COALESCE 排序
  RETURN QUERY
  SELECT
    v.id, v.title, v.description,
    v.thumbnail_url, v.video_url,
    v.duration, v.language, v.difficulty,
    v.content_type, v.cover_url,
    v.status, v.display_order,
    v.creator_name, v.source_url,
    v.view_count, v.learning_date,
    v.created_at, v.published_at,
    v.updated_at, v.package_ids,
    (SELECT COALESCE(array_agg(vt.name), '{}')
     FROM video_tag_relations vtr2
     JOIN video_tags vt ON vt.id = vtr2.tag_id
     WHERE vtr2.video_id = v.id) AS tag_names,
    v_total AS total_count
  FROM videos v
  WHERE v.status = 'published'
    AND (v.learning_date IS NULL OR v.learning_date <= p_today)
    AND (p_language IS NULL OR v.language = p_language)
    AND (p_difficulty IS NULL OR v.difficulty = p_difficulty)
    AND (p_tag_ids IS NULL OR EXISTS (
      SELECT 1 FROM video_tag_relations vtr
      WHERE vtr.video_id = v.id AND vtr.tag_id = ANY(p_tag_ids)
    ))
    AND (p_learn_status = 'all'
         OR (p_learn_status = 'learned' AND v.id = ANY(p_learned_video_ids))
         OR (p_learn_status = 'unlearned' AND (p_learned_video_ids IS NULL OR NOT (v.id = ANY(p_learned_video_ids))))
    )
    AND (p_has_permission = TRUE
         OR p_package_ids IS NULL
         OR v.package_ids = '{}'
         OR v.package_ids && p_package_ids
    )
    AND (p_content_type IS NULL OR v.content_type = p_content_type)
  ORDER BY COALESCE(v.learning_date, v.published_at, v.created_at) DESC,
           v.published_at DESC,
           v.created_at DESC,
           v.id DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
