-- ============================================================================
-- 功能：首页多进度卡片查询
-- 目的：单次RPC调用获取用户最近3本书的学习进度，性能 <200ms
-- 创建时间：2026-01-14
-- ============================================================================

-- 创建RPC函数：获取用户最近的学习进度卡片
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
  -- 使用JSONB聚合优化性能
BEGIN
  RETURN QUERY
  SELECT
    -- 词书基本信息
    ubp.book_id::TEXT,
    COALESCE(b.title, 'Unknown Book') as book_title,

    -- 从 last_resume_state 中提取学习信息
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

    -- 计算进度百分比（避免除零错误）
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

    -- 最后学习时间
    COALESCE(ubp.updated_at::BIGINT * 1000, ubp.last_resume_state->>'updatedAt')::BIGINT as last_study_time

  FROM user_book_preferences ubp

  -- JOIN词书表获取标题（注意：表名是 books 不是 wordbooks）
  LEFT JOIN books b ON b.id::TEXT = ubp.book_id

  -- 只查询有恢复状态的记录
  WHERE ubp.user_id = p_user_id
    AND ubp.last_resume_state IS NOT NULL
    AND ubp.last_resume_state != '{}'::JSONB

  -- 按最后学习时间降序排列（最近学习的在前）
  ORDER BY ubp.updated_at DESC

  -- 限制返回3条记录
  LIMIT 3;
END;
$$;

-- ============================================================================
-- 性能优化：添加索引以加速查询
-- ============================================================================

-- 索引1：user_id + updated_at DESC（支持按时间排序）
-- 说明：这是ORDER BY ubp.updated_at DESC的覆盖索引
CREATE INDEX IF NOT EXISTS idx_user_book_prefs_user_updated
  ON user_book_preferences(user_id, updated_at DESC)
  WHERE last_resume_state IS NOT NULL AND last_resume_state != '{}'::JSONB;

-- 索引2：book_id（加速JOIN wordbooks）
-- 说明：虽然通常user_id已经很有选择性，但为了进一步优化JOIN操作
CREATE INDEX IF NOT EXISTS idx_user_book_prefs_book_id
  ON user_book_preferences(book_id)
  WHERE last_resume_state IS NOT NULL;

-- ============================================================================
-- 权限配置：允许认证用户调用
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_progress_cards(UUID) TO authenticated;

-- ============================================================================
-- 测试用例（手动测试时使用）
-- ============================================================================

-- 测试1：查看函数是否创建成功
/*
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'get_user_progress_cards';
*/

-- 测试2：为特定用户调用RPC（替换 YOUR_USER_ID）
/*
SELECT * FROM get_user_progress_cards('YOUR_USER_ID'::UUID);
*/

-- 测试3：性能测试（EXPLAIN ANALYZE）
/*
EXPLAIN ANALYZE
SELECT * FROM get_user_progress_cards('YOUR_USER_ID'::UUID);
-- 期望：执行时间 < 200ms
*/

-- ============================================================================
-- 注释说明
-- ============================================================================
COMMENT ON FUNCTION get_user_progress_cards IS
'获取用户最近3本书的学习进度卡片，用于首页"继续学习"区域展示。

参数：
  p_user_id: 用户UUID

返回字段：
  - book_id: 词书ID
  - book_title: 词书标题
  - mode: 学习模式 (word-list/flashcards/dictation/match-game)
  - scope_type: 学习范围 (all/unknown/fuzzy/known/new)
  - current_index: 当前单词索引（0-based）
  - total_words: 该范围总单词数
  - progress: 进度百分比（0-100）
  - last_study_time: 最后学习时间戳（毫秒）

性能指标：
  - 目标：<200ms (使用单次RPC + 聚合查询)
  - 索引优化：user_id + updated_at 复合索引

排序规则：
  - 按 updated_at DESC（最近学习的在前）
  - LIMIT 3（最多返回3条）
';
