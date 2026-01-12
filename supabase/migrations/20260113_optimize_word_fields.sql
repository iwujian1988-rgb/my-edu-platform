-- 优化的单词查询函数 - 只返回列表页需要的字段
CREATE OR REPLACE FUNCTION get_book_words_paginated_optimized(
  book_uuid UUID,
  offset_val INTEGER DEFAULT 0,
  limit_val INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  word TEXT,
  phonetic TEXT,
  uk_phonetic TEXT,
  us_phonetic TEXT,
  definition TEXT,
  definition_en TEXT,
  part_of_speech TEXT,
  order_index INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      w.id,
      w.word,
      w.phonetic,
      w.uk_phonetic,
      w.us_phonetic,
      w.definition,
      w.definition_en,
      w.part_of_speech,
      w.order_index
    FROM words w
    INNER JOIN chapters c ON w.chapter_id = c.id
    WHERE c.book_id = book_uuid
    ORDER BY w.order_index ASC
    LIMIT limit_val
    OFFSET offset_val;
END;
$$;

COMMENT ON FUNCTION get_book_words_paginated_optimized IS '优化的分页查询，只返回列表需要的字段（不包含长文本字段）';
