-- ============================================================================
-- 修复：使用最保守的写法，每个字段都显式 CAST()
-- 执行时间：2026-01-14
-- ============================================================================

-- 删除旧函数
DROP FUNCTION IF EXISTS get_user_progress_cards(p_user_id UUID);

-- 纯 SQL 函数，所有字段显式 CAST
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
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    CAST(ubp.book_id AS TEXT),
    CAST(COALESCE(b.title, 'Unknown Book') AS TEXT),
    CAST(COALESCE((ubp.last_resume_state->>'mode')::TEXT, 'word-list') AS TEXT),
    CAST(COALESCE(
      (ubp.last_resume_state->'context'->>'scope')::TEXT,
      (ubp.last_resume_state->'context'->>'scopeType')::TEXT,
      'unknown'
    ) AS TEXT),
    CAST(COALESCE(
      (ubp.last_resume_state->'context'->>'index')::INTEGER,
      (ubp.last_resume_state->'context'->>'currentIndex')::INTEGER,
      0
    ) AS INTEGER),
    CAST(COALESCE(
      (ubp.last_resume_state->'context'->>'totalWords')::INTEGER,
      (ubp.last_resume_state->'context'->>'total_words_in_scope')::INTEGER,
      0
    ) AS INTEGER),
    CAST(CASE
      WHEN COALESCE(
        (ubp.last_resume_state->'context'->>'totalWords')::INTEGER,
        (ubp.last_resume_state->'context'->>'total_words_in_scope')::INTEGER,
        0
      ) > 0
      THEN COALESCE((ubp.last_resume_state->'context'->>'index')::INTEGER, 0) * 100 /
        NULLIF(COALESCE((ubp.last_resume_state->'context'->>'totalWords')::INTEGER, 0), 0)
      ELSE 0
    END AS INTEGER),
    CAST(EXTRACT(EPOCH FROM ubp.updated_at) * 1000 AS BIGINT)
  FROM user_book_preferences ubp
  LEFT JOIN books b ON b.id::TEXT = ubp.book_id
  WHERE ubp.user_id = p_user_id
    AND ubp.last_resume_state IS NOT NULL
    AND ubp.last_resume_state != '{}'::JSONB
  ORDER BY ubp.updated_at DESC
  LIMIT 3;
$$;

-- 授权
GRANT EXECUTE ON FUNCTION get_user_progress_cards(UUID) TO authenticated;

-- 验证
DO $$
BEGIN
  RAISE NOTICE '✅ 函数 get_user_progress_cards 创建成功';
END $$;
