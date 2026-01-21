-- 检查是否有章节数据
SELECT COUNT(*) as chapter_count FROM chapters;

-- 查看所有章节
SELECT id, title, book_id, order_index FROM chapters ORDER BY book_id, order_index;

-- 查看所有书籍
SELECT id, title, total_words FROM books ORDER BY created_at DESC LIMIT 5;

-- 查看单词是否有 chapter_id
SELECT
  COUNT(*) as total_words,
  COUNT(chapter_id) as words_with_chapter,
  COUNT(*) - COUNT(chapter_id) as words_without_chapter
FROM words;

-- 查看没有 chapter_id 的单词所属的书籍
SELECT DISTINCT
  b.id as book_id,
  b.title as book_title,
  COUNT(w.id) as word_count
FROM books b
JOIN words w ON w.book_id = b.id
WHERE w.chapter_id IS NULL
GROUP BY b.id, b.title;
