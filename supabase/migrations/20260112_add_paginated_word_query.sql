-- 创建分页查询单词的RPC函数
CREATE OR REPLACE FUNCTION get_book_words_paginated(
  book_uuid UUID,
  offset_val INTEGER DEFAULT 0,
  limit_val INTEGER DEFAULT 50
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
    LIMIT limit_val
    OFFSET offset_val;
END;
$$;

COMMENT ON FUNCTION get_book_words_paginated IS '分页获取词书单词，避免一次加载全部数据';
