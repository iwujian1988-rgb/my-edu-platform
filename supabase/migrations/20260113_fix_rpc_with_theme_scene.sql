-- 修复RPC函数 - 正确地JOIN获取theme和scene
-- Fix RPC function to properly JOIN chapters, themes, and scenes

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
  chapter TEXT,
  chapter_id UUID,
  theme TEXT,
  scene TEXT,
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
    c.title AS chapter,          -- 章节标题
    w.chapter_id,
    t.name AS theme,             -- 主题名称（可能为NULL）
    s.name AS scene,             -- 场景名称（可能为NULL）
    w.order_index
  FROM words w
  LEFT JOIN chapters c ON w.chapter_id = c.id
  LEFT JOIN themes t ON c.theme_id = t.id
  LEFT JOIN scenes s ON c.scene_id = s.id
  WHERE w.book_id = book_uuid
  ORDER BY w.order_index ASC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

COMMENT ON FUNCTION get_book_words_paginated_optimized IS '优化的分页查询，JOIN获取theme和scene名称';
