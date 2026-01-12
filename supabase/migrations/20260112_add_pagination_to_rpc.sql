-- 修改 get_book_words RPC 函数，添加分页参数
-- 解决 PostgREST 对 RPC 返回值的1000行限制

-- 删除旧函数
DROP FUNCTION IF EXISTS get_book_words(UUID);

-- 创建新函数，支持分页参数
CREATE OR REPLACE FUNCTION get_book_words_paginated(
  book_uuid UUID,
  offset_value INTEGER DEFAULT 0,
  limit_value INTEGER DEFAULT 1000
)
RETURNS SETOF words
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT w.*
    FROM words w
    INNER JOIN chapters c ON w.chapter_id = c.id
    WHERE c.book_id = book_uuid
    ORDER BY w.order_index ASC
    LIMIT limit_value
    OFFSET offset_value;
END;
$$;

-- 添加注释
COMMENT ON FUNCTION get_book_words_paginated IS '分页获取词书单词。参数：book_uuid-词书ID, offset_value-偏移量, limit_value-每页数量。返回：单词列表。';

-- 同时保留一个获取总数的函数
CREATE OR REPLACE FUNCTION get_book_word_count(book_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  word_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO word_count
  FROM words w
  INNER JOIN chapters c ON w.chapter_id = c.id
  WHERE c.book_id = book_uuid;

  RETURN word_count;
END;
$$;

COMMENT ON FUNCTION get_book_word_count IS '获取词书单词总数';
