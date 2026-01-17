-- ============================================================================
-- 修复：更新 RPC 函数使用正确的表名（books 而不是 wordbooks）
-- 执行时间：2026-01-14
-- ============================================================================

-- 删除旧的 RPC 函数
DROP FUNCTION IF EXISTS get_user_progress_cards(p_user_id UUID);

-- 重新创建 RPC 函数（使用正确的表名 books）
CREATE OR REPLACE FUNCTION get_user_progress_cards(p_user_id UUID)
RETURNS TABLE (
  book_id TEXT,
  book_title TEXT,
  mode TEXT,
  scope_type TEXT,
  current_index INTEGER,
  total_words INTEGER,
  progress INTEGER,
  last_study_time BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
BEGIN
  RETURN QUERY
  SELECT
    ubp.book_id::TEXT,
    COALESCE(b.title, 'Unknown Book') as book_title,

    COALESCE(
      (ubp.last_resume_state->>'mode')::TEXT,
      'word-list'
    ) as mode,

    COALESCE(
      (ubp.last_resume_state->'context'->>'scope')::TEXT,
      (ubp.last_resume_state->'context'->>'scopeType')::TEXT,
      'unknown'
    ) as scope_type,

    COALESCE(
      (ubp.last_resume_state->'context'->>'index')::INTEGER,
      (ubp.last_resume_state->'context'->>'currentIndex')::INTEGER,
      0
    ) as current_index,

    COALESCE(
      (ubp.last_resume_state->'context'->>'totalWords')::INTEGER,
      (ubp.last_resume_state->'context'->>'total_words_in_scope')::INTEGER,
      0
    ) as total_words,

    CASE
      WHEN COALESCE(
        (ubp.last_resume_state->'context'->>'totalWords')::INTEGER,
        (ubp.last_resume_state->'context'->>'total_words_in_scope')::INTEGER,
        0
      ) > 0
      THEN ROUND(
        (
          COALESCE((ubp.last_resume_state->'context'->>'index')::INTEGER, 0) * 100.0 /
          NULLIF(
            COALESCE((ubp.last_resume_state->'context'->>'totalWords')::INTEGER, 0),
            0
          )
        )::NUMERIC,
        0
      )
      ELSE 0
    END as progress,

    COALESCE(ubp.updated_at::BIGINT * 1000, ubp.last_resume_state->>'updatedAt')::BIGINT as last_study_time

  FROM user_book_preferences ubp

  LEFT JOIN books b ON b.id::TEXT = ubp.book_id

  WHERE ubp.user_id = p_user_id
    AND ubp.last_resume_state IS NOT NULL
    AND ubp.last_resume_state != '{}'::JSONB

  ORDER BY ubp.updated_at DESC
  LIMIT 3;
END;
$$;

-- 授权
GRANT EXECUTE ON FUNCTION get_user_progress_cards(UUID) TO authenticated;
