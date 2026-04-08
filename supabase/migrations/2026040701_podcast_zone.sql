-- 播客专区 + 播主详情页 SQL 迁移
-- 1. get_podcast_creators: 返回有音频内容的活跃播主
-- 2. get_creator_published_content: 返回指定播主的全部已发布内容（带分页和 total_count）

-- =============================================
-- 1. 播客专区：获取有音频内容的播主列表
-- =============================================
CREATE OR REPLACE FUNCTION get_podcast_creators(p_limit INT DEFAULT 8)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  avatar_url TEXT,
  description TEXT,
  platform VARCHAR(50),
  audio_count BIGINT,
  latest_covers TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.id,
    uc.name,
    uc.avatar_url,
    uc.description,
    uc.platform,
    COUNT(v.id)::BIGINT AS audio_count,
    -- 取最新 5 张封面（cover_url 优先，fallback 到 thumbnail_url）
    COALESCE(
      ARRAY(
        SELECT COALESCE(v2.cover_url, v2.thumbnail_url)
        FROM videos v2
        WHERE v2.creator_id = uc.id
          AND v2.status = 'published'
          AND v2.content_type = 'audio'
        ORDER BY v2.published_at DESC NULLS LAST
        LIMIT 5
      ),
      ARRAY[]::TEXT[]
    ) AS latest_covers
  FROM upstream_creators uc
  INNER JOIN videos v ON v.creator_id = uc.id
    AND v.status = 'published'
    AND v.content_type = 'audio'
  WHERE uc.is_active = true
  GROUP BY uc.id, uc.name, uc.avatar_url, uc.description, uc.platform
  ORDER BY audio_count DESC, uc.display_order ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;


-- =============================================
-- 2. 播主详情：获取指定播主的全部已发布内容
-- =============================================
CREATE OR REPLACE FUNCTION get_creator_published_content(
  p_creator_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  original_title VARCHAR(255),
  album_title VARCHAR(255),
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  duration INT,
  language VARCHAR(10),
  difficulty VARCHAR(20),
  content_type VARCHAR(20),
  cover_url TEXT,
  status VARCHAR(20),
  display_order INT,
  creator_name VARCHAR(100),
  creator_id UUID,
  source_url TEXT,
  view_count INT,
  learning_date DATE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  package_ids UUID[],
  tag_names TEXT[],
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.title,
    v.original_title,
    v.album_title,
    v.description,
    v.thumbnail_url,
    v.video_url,
    v.duration,
    v.language,
    v.difficulty,
    v.content_type,
    v.cover_url,
    v.status,
    v.display_order,
    v.creator_name,
    v.creator_id,
    v.source_url,
    v.view_count,
    v.learning_date,
    v.published_at,
    v.created_at,
    v.updated_at,
    v.package_ids,
    -- 聚合标签名
    COALESCE(
      ARRAY(
        SELECT vt.name
        FROM video_tag_relations vtr
        JOIN video_tags vt ON vt.id = vtr.tag_id
        WHERE vtr.video_id = v.id
      ),
      ARRAY[]::TEXT[]
    ) AS tag_names,
    -- 窗口函数计算总行数（仅扫描一次）
    COUNT(*) OVER()::BIGINT AS total_count
  FROM videos v
  WHERE v.creator_id = p_creator_id
    AND v.status = 'published'
  ORDER BY v.published_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
