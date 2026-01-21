-- 检查章节数据
SELECT
  id,
  title,
  book_id,
  word_count,
  created_at
FROM chapters
ORDER BY book_id, order_index
LIMIT 20;

-- 检查单词的章节分布
SELECT
  c.id as chapter_id,
  c.title as chapter_title,
  c.book_id,
  COUNT(w.id) as word_count,
  COUNT(CASE WHEN w.status IS NOT NULL THEN 1 END) as words_with_status
FROM chapters c
LEFT JOIN words w ON w.chapter_id = c.id
GROUP BY c.id, c.title, c.book_id
ORDER BY c.book_id, c.order_index
LIMIT 20;

-- 检查是否有单词没有章节（chapter_id为NULL）
SELECT
  COUNT(*) as words_without_chapter,
  COUNT(CASE WHEN status IS NOT NULL THEN 1 END) as with_status
FROM words
WHERE chapter_id IS NULL;

-- 检查是否有单词有章节
SELECT
  COUNT(*) as words_with_chapter,
  COUNT(CASE WHEN status IS NOT NULL THEN 1 END) as with_status
FROM words
WHERE chapter_id IS NOT NULL;
