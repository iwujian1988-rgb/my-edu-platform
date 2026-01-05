-- ============================================
-- 测试数据插入脚本
-- ============================================

-- 注意：运行此脚本前，请确保已经创建了 users 表
-- 如果 users 表还不存在，请先运行 tech_spec.md 中的 users 表创建语句

-- --------------------------------------------
-- 1. 创建测试用户（如果不存在）
-- --------------------------------------------
-- 注意：这个语句依赖于 users 表的存在
-- INSERT INTO users (id, phone_number, password_hash, created_at)
-- VALUES (
--   gen_random_uuid(),
--   '13800138000',
--   '$2b$10$test_password_hash',
--   NOW()
-- )
-- ON CONFLICT (phone_number) DO NOTHING;

-- --------------------------------------------
-- 2. 创建测试单词书
-- --------------------------------------------
INSERT INTO books (
  id,
  title,
  description,
  category,
  is_official,
  total_words,
  total_chapters,
  is_published,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '测试单词书',
  '这是一个用于测试的单词书',
  'custom',
  false,
  0,
  1,
  true,
  NOW(),
  NOW()
)
RETURNING id AS book_id;

-- --------------------------------------------
-- 3. 创建第一章（需要手动替换 book_id）
-- --------------------------------------------
-- 注意：运行上面的 INSERT 后，复制返回的 book_id，然后运行下面的语句
-- 将 <BOOK_ID> 替换为上面返回的实际 UUID

-- INSERT INTO chapters (
--   id,
--   book_id,
--   title,
--   order_index,
--   word_count,
--   created_at
-- ) VALUES (
--   gen_random_uuid(),
--   '<BOOK_ID>',
--   '第一章',
--   1,
--   0,
--   NOW()
-- );

-- --------------------------------------------
-- 4. 一键插入完整测试数据（推荐使用）
-- --------------------------------------------
-- 使用 CTE (Common Table Expression) 一次性完成插入

WITH new_book AS (
  INSERT INTO books (
    id,
    title,
    description,
    category,
    is_official,
    total_words,
    total_chapters,
    is_published,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    '测试单词书',
    '这是一个用于测试的单词书',
    'custom',
    false,
    0,
    1,
    true,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO chapters (
  id,
  book_id,
  title,
  order_index,
  word_count,
  created_at
)
SELECT
  gen_random_uuid(),
  new_book.id,
  '第一章',
  1,
  0,
  NOW()
FROM new_book;

-- --------------------------------------------
-- 5. 验证插入结果
-- --------------------------------------------
-- 查询所有单词书
-- SELECT id, title, description, category, is_published, created_at
-- FROM books
-- ORDER BY created_at DESC;

-- 查询所有章节及其关联的单词书
-- SELECT
--   c.id AS chapter_id,
--   c.title AS chapter_title,
--   c.order_index,
--   b.id AS book_id,
--   b.title AS book_title
-- FROM chapters c
-- JOIN books b ON c.book_id = b.id
-- ORDER BY b.created_at DESC, c.order_index;
