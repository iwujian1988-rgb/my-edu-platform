-- 创建高效的单词统计 RPC 函数
-- 性能优化：使用数据库聚合，避免拉取所有数据到内存

CREATE OR REPLACE FUNCTION count_words_by_status(p_book_id UUID)
RETURNS TABLE(
  unknown BIGINT,
  fuzzy BIGINT,
  known BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN status = 'unknown' THEN 1 ELSE 0 END), 0)::BIGINT as unknown,
    COALESCE(SUM(CASE WHEN status = 'fuzzy' THEN 1 ELSE 0 END), 0)::BIGINT as fuzzy,
    COALESCE(SUM(CASE WHEN status = 'known' THEN 1 ELSE 0 END), 0)::BIGINT as known
  FROM word_progress
  WHERE book_id = p_book_id;
END;
$$;

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_word_progress_book_status
ON word_progress(book_id, status);

COMMENT ON FUNCTION count_words_by_status IS '高效统计指定词库各状态的单词数量';
