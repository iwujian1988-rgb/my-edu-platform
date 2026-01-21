-- 检查单词书的进度分布
-- 替换 YOUR_BOOK_ID 为实际的词书ID

SELECT
  '总单词数' as label,
  total_words as count
FROM books
WHERE id = 'YOUR_BOOK_ID'

UNION ALL

SELECT
  '有进度记录的单词' as label,
  COUNT(*) as count
FROM word_progress
WHERE book_id = 'YOUR_BOOK_ID'

UNION ALL

SELECT
  '认识的单词' as label,
  COUNT(*) as count
FROM word_progress
WHERE book_id = 'YOUR_BOOK_ID' AND status = 'known'

UNION ALL

SELECT
  '模糊的单词' as label,
  COUNT(*) as count
FROM word_progress
WHERE book_id = 'YOUR_BOOK_ID' AND status = 'fuzzy'

UNION ALL

SELECT
  '不认识的单词' as label,
  COUNT(*) as count
FROM word_progress
WHERE book_id = 'YOUR_BOOK_ID' AND status = 'unknown'

UNION ALL

SELECT
  '未标注的单词（数据库中）' as label,
  COUNT(*) as count
FROM word_progress
WHERE book_id = 'YOUR_BOOK_ID' AND status = 'new';
