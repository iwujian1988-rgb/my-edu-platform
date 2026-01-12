-- 创建 get_book_words RPC 函数
-- 用于绕过 Supabase .in() 查询的1000行限制，获取词书的完整单词列表
-- 优化性能：使用 SECURITY DEFINER 和高效的 JOIN 查询

CREATE OR REPLACE FUNCTION get_book_words(book_uuid UUID)
RETURNS SETOF words
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- 显式声明为返回多行数据
  words_result RECORD;
BEGIN
  -- 使用更高效的 JOIN 查询，并通过游标返回所有行
  -- Supabase RPC 默认限制通过显式查询绕过
  FOR words_result IN
    SELECT w.*
    FROM words w
    INNER JOIN chapters c ON w.chapter_id = c.id
    WHERE c.book_id = book_uuid
    ORDER BY w.order_index ASC
  LOOP
    RETURN NEXT words_result;
  END LOOP;

  RETURN;
END;
$$;

-- 添加注释
COMMENT ON FUNCTION get_book_words IS '获取指定词书的全部单词（无行数限制）。参数：book_uuid - 词书UUID。返回：完整的单词列表。';

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_words_chapter_id ON words(chapter_id);
CREATE INDEX IF NOT EXISTS idx_words_order_index ON words(order_index);
CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON chapters(book_id);

-- 查询计划分析：确保使用了正确的索引
-- EXPLAIN ANALYZE SELECT * FROM get_book_words('book-uuid');
