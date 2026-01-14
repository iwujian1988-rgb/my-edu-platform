-- 修复RPC函数 - 移除所有不存在的字段（theme, scene, chapter）
-- Fix RPC function - remove all non-existent columns

DROP FUNCTION IF EXISTS get_book_words_paginated_optimized(UUID, INTEGER, INTEGER);

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
  collocation TEXT,
  collocation_en TEXT,
  example_sentence TEXT,
  example_sentence_en TEXT,
  part_of_speech TEXT,
  chapter_id UUID,
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
    w.collocation,
    w.collocation_en,
    w.example_sentence,
    w.example_sentence_en,
    w.part_of_speech,
    w.chapter_id,
    w.order_index
  FROM words w
  WHERE w.book_id = book_uuid
  ORDER BY w.order_index ASC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

COMMENT ON FUNCTION get_book_words_paginated_optimized IS '优化的分页查询，返回列表需要的所有字段，使用book_id直接查询';
