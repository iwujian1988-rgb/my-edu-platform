-- ============================================================================
-- 词库scope统计函数（高性能）
-- 版本: v1.0.0
-- 日期: 2026-01-16
-- 说明: 一次性获取词库的所有学习范围单词统计，用于词库选择器
-- ============================================================================

-- 创建函数：获取词库的scope统计
CREATE OR REPLACE FUNCTION get_book_scope_stats(
  p_book_id UUID,
  p_total_words INTEGER
)
RETURNS TABLE (
  all INTEGER,
  unknown INTEGER,
  fuzzy INTEGER,
  new INTEGER,
  known INTEGER,
  mistakes INTEGER
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
    p_total_words as all,
    COALESCE((SELECT count FROM progress_counts WHERE status = 'unknown'), 0) as unknown,
    COALESCE((SELECT count FROM progress_counts WHERE status = 'fuzzy'), 0) as fuzzy,
    GREATEST(0, p_total_words - COALESCE((SELECT count FROM progress_counts WHERE status = 'unknown'), 0)
                            - COALESCE((SELECT count FROM progress_counts WHERE status = 'fuzzy'), 0)
                            - COALESCE((SELECT count FROM progress_counts WHERE status = 'known'), 0)) as new,
    COALESCE((SELECT count FROM progress_counts WHERE status = 'known'), 0) as known,
    COALESCE((SELECT count FROM mistake_count), 0) as mistakes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON FUNCTION get_book_scope_stats IS '一次性获取词库的所有学习范围单词统计（all, unknown, fuzzy, new, known, mistakes）';

-- 授权
GRANT EXECUTE ON FUNCTION get_book_scope_stats TO authenticated;
