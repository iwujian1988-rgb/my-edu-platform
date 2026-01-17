-- ============================================================================
-- 修复：timestamp 类型无法直接转换为 bigint
-- 问题：ubp.updated_at 是 timestamp with time zone，需要先提取 epoch
-- 执行时间：2026-01-14
-- ============================================================================

-- 删除旧函数
DROP FUNCTION IF EXISTS get_user_progress_cards(p_user_id UUID);

-- 重新创建函数（修复 timestamp 转换）
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

    -- 修复：使用 EXTRACT(EPOCH FROM ...) 将 timestamp 转换为 Unix 时间戳（秒），再乘以 1000 转为毫秒
    COALESCE(
      EXTRACT(EPOCH FROM ubp.updated_at)::BIGINT * 1000,
      (ubp.last_resume_state->>'updatedAt')::BIGINT
    ) as last_study_time

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
