-- 修复章节筛选bug：为RPC函数添加chapter_id参数
-- 问题：之前的RPC函数不支持章节筛选，导致选择章节时返回整本书的数据
-- 解决：添加可选的chapter_id参数，当指定时只返回该章节的单词

-- 1. 修复 get_book_words_paginated_optimized 函数
DROP FUNCTION IF EXISTS get_book_words_paginated_optimized(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_book_words_paginated_optimized(
  book_uuid UUID,
  offset_val INTEGER DEFAULT 0,
  limit_val INTEGER DEFAULT 50,
  filter_chapter_id UUID DEFAULT NULL  -- 🔥 新增：可选的章节筛选参数（改名避免与返回列冲突）
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
  theme TEXT,
  scene TEXT,
  chapter TEXT,
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
    w.theme,
    w.scene,
    w.chapter,
    w.chapter_id,
    w.order_index
  FROM words w
  INNER JOIN chapters c ON w.chapter_id = c.id
  WHERE
    c.book_id = book_uuid
    AND (filter_chapter_id IS NULL OR c.id = filter_chapter_id)  -- 🔥 章节筛选逻辑
  ORDER BY w.order_index ASC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

COMMENT ON FUNCTION get_book_words_paginated_optimized IS '优化的分页查询，支持章节筛选。参数：book_uuid(必填), offset_val, limit_val, filter_chapter_id(可选)。返回：指定书籍（可选章节）的单词列表';

-- 2. 修复 get_book_words_paginated 函数
-- 先检查函数是否存在并获取其签名
DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_book_words_paginated'
  ) INTO func_exists;

  IF func_exists THEN
    -- 删除旧函数（假设签名是 book_uuid, offset_val, limit_val）
    DROP FUNCTION IF EXISTS get_book_words_paginated(UUID, INTEGER, INTEGER);
  END IF;
END $$;

-- 创建支持章节筛选的新版本
CREATE OR REPLACE FUNCTION get_book_words_paginated(
  book_uuid UUID,
  offset_val INTEGER DEFAULT 0,
  limit_val INTEGER DEFAULT 50,
  filter_chapter_id UUID DEFAULT NULL  -- 🔥 新增：可选的章节筛选参数（改名避免与返回列冲突）
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
  theme TEXT,
  scene TEXT,
  chapter TEXT,
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
    w.theme,
    w.scene,
    w.chapter,
    w.chapter_id,
    w.order_index
  FROM words w
  INNER JOIN chapters c ON w.chapter_id = c.id
  WHERE
    c.book_id = book_uuid
    AND (filter_chapter_id IS NULL OR c.id = filter_chapter_id)  -- 🔥 章节筛选逻辑
  ORDER BY w.order_index ASC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

COMMENT ON FUNCTION get_book_words_paginated IS '分页查询，支持章节筛选。参数：book_uuid(必填), offset_val, limit_val, filter_chapter_id(可选)。返回：指定书籍（可选章节）的单词列表';
