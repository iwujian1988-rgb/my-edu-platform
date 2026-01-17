-- ============================================================================
-- 修复打字练习最近记录查询的book name字段错误
-- 版本: v1.0.1
-- 日期: 2026-01-16
-- 说明: books表使用的是title字段而不是name字段
-- ============================================================================

-- 删除旧的函数并重新创建
DROP FUNCTION IF EXISTS get_typing_recent_practice(p_user_id UUID);

CREATE OR REPLACE FUNCTION get_typing_recent_practice(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  book_id UUID,
  book_title VARCHAR(255),
  scope TEXT,
  last_practice_at TIMESTAMPTZ,
  practice_count INTEGER
) LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    trp.id,
    trp.book_id,
    b.title AS book_title,
    trp.scope,
    trp.last_practice_at,
    trp.practice_count
  FROM typing_recent_practice trp
  JOIN books b ON trp.book_id = b.id
  WHERE trp.user_id = p_user_id
  ORDER BY trp.last_practice_at DESC
  LIMIT 5;
END;
$$;

COMMENT ON FUNCTION get_typing_recent_practice IS '获取用户最近的5条打字练习配置记录（已修复book字段）';
