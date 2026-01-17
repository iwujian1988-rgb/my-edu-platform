-- ============================================================================
-- 修复 get_book_scope_stats 函数返回类型不匹配问题
-- 问题: COUNT(*) 返回 BIGINT，但函数定义为 INTEGER，导致类型错误
-- 错误代码: 42804 - Returned type bigint does not match expected type integer
-- 日期: 2026-01-16
-- ============================================================================

-- 删除旧函数
DROP FUNCTION IF EXISTS get_book_scope_stats(UUID, INTEGER);

-- 重新创建函数，返回类型改为 BIGINT
-- 注意："all" 是保留关键字，需要用双引号括起来
CREATE OR REPLACE FUNCTION get_book_scope_stats(
  p_book_id UUID,
  p_total_words BIGINT
)
RETURNS TABLE (
  "all" BIGINT,
  unknown BIGINT,
  fuzzy BIGINT,
  new BIGINT,
  known BIGINT,
  mistakes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- 获取各状态的单词数
  progress_counts AS (
    SELECT
      status,
      COUNT(*) as count
    FROM word_progress
    WHERE book_id = p_book_id
    GROUP BY status
  ),
  -- 获取错题本单词数
  mistake_count AS (
    SELECT COUNT(*) as count
    FROM mistakes
    WHERE book_id = p_book_id
  )
  SELECT
    p_total_words as "all",
    COALESCE((SELECT count FROM progress_counts WHERE status = 'unknown'), 0)::BIGINT as unknown,
    COALESCE((SELECT count FROM progress_counts WHERE status = 'fuzzy'), 0)::BIGINT as fuzzy,
    GREATEST(0, p_total_words - COALESCE((SELECT count FROM progress_counts WHERE status = 'unknown'), 0)
                            - COALESCE((SELECT count FROM progress_counts WHERE status = 'fuzzy'), 0)
                            - COALESCE((SELECT count FROM progress_counts WHERE status = 'known'), 0))::BIGINT as new,
    COALESCE((SELECT count FROM progress_counts WHERE status = 'known'), 0)::BIGINT as known,
    COALESCE((SELECT count FROM mistake_count), 0)::BIGINT as mistakes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON FUNCTION get_book_scope_stats IS '一次性获取词库的所有学习范围单词统计（all, unknown, fuzzy, new, known, mistakes），返回类型为BIGINT。注意：all是保留关键字，返回时使用双引号';

-- 授权
GRANT EXECUTE ON FUNCTION get_book_scope_stats(UUID, BIGINT) TO authenticated;

-- ============================================================================
-- 测试查询（手动测试时使用）
-- ============================================================================
-- SELECT * FROM get_book_scope_stats('YOUR_BOOK_ID'::UUID, 520);
-- 应该返回: all | unknown | fuzzy | new | known | mistakes
