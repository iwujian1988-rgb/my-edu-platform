-- 查询"新概念英语第四册"这本书的ID
SELECT id, title, total_words
FROM books
WHERE title LIKE '%新概念%第四册%';

-- 查询这本书有多少"unknown"状态的单词
SELECT
  b.title,
  COUNT(*) as unknown_count
FROM word_progress wp
JOIN books b ON b.id = wp.book_id
WHERE b.title LIKE '%新概念%第四册%'
  AND wp.status = 'unknown'
GROUP BY b.title;

-- 查看所有用户的错题统计
SELECT
  wp.user_id,
  b.title,
  wp.status,
  COUNT(*) as count
FROM word_progress wp
JOIN books b ON b.id = wp.book_id
WHERE wp.status IN ('unknown', 'fuzzy')
GROUP BY wp.user_id, b.title, wp.status
ORDER BY wp.user_id, b.title, wp.status;
