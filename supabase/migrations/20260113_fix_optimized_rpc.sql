-- 删除旧函数
DROP FUNCTION IF EXISTS get_book_words_paginated_optimized(UUID, INTEGER, INTEGER);

-- 创建优化的查询函数（使用RETURNS SETOF record）
CREATE OR REPLACE FUNCTION get_book_words_paginated_optimized(
  book_uuid UUID,
  offset_val INTEGER DEFAULT 0,
  limit_val INTEGER DEFAULT 50
)
RETURNS SETOF record
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format('
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
    WHERE c.book_id = $1
    ORDER BY w.order_index ASC
    LIMIT $2
    OFFSET $3
  ') USING book_uuid, limit_val, offset_val;
END;
$$;

COMMENT ON FUNCTION get_book_words_paginated_optimized IS '优化的分页查询，只返回列表需要的9个字段';
