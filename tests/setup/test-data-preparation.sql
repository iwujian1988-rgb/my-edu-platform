-- ============================================
-- 测试数据准备脚本
-- 用途：为自动化测试准备完整的测试场景数据
-- 执行方式: psql -h [host] -U [user] -d [database] -f test-data-preparation.sql
-- ============================================

-- 清理旧测试数据（可选）
-- DELETE FROM auth.users WHERE email LIKE 'test-%@example.com';
-- DELETE FROM books WHERE title LIKE '测试-%';

-- ============================================
-- 1. 测试用户创建
-- ============================================

-- 普通用户1: 用于前台学习流程测试
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test-user1@example.com',
  crypt('Test123456', gen_salt('bf')),
  NOW(),
  '{"name":"测试用户1","role":"user"}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (
  id,
  email,
  name,
  role,
  is_banned,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test-user1@example.com',
  '测试用户1',
  'user',
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 普通用户2: 用于权限测试
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'test-user2@example.com',
  crypt('Test123456', gen_salt('bf')),
  NOW(),
  '{"name":"测试用户2","role":"user"}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (
  id,
  email,
  name,
  role,
  is_banned,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'test-user2@example.com',
  '测试用户2',
  'user',
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 受封禁用户: 用于权限限制测试
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'test-banned@example.com',
  crypt('Test123456', gen_salt('bf')),
  NOW(),
  '{"name":"受封禁用户","role":"user"}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (
  id,
  email,
  name,
  role,
  is_banned,
  ban_reason,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'test-banned@example.com',
  '受封禁用户',
  'user',
  true,
  '违反社区规则',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. 测试单词书创建
-- ============================================

-- 官方单词书1: 考试类（用于学习流程测试）
INSERT INTO public.books (
  id,
  title,
  description,
  category,
  is_official,
  is_published,
  total_words,
  total_chapters,
  cover_url,
  difficulty_level,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '测试-四级核心词汇',
  '大学英语四级考试核心词汇，包含高频词汇2000个',
  'exam',
  true,
  true,
  0,
  0,
  null,
  'intermediate',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 官方单词书2: 场景类（用于消消乐测试）
INSERT INTO public.books (
  id,
  title,
  description,
  category,
  is_official,
  is_published,
  total_words,
  total_chapters,
  cover_url,
  difficulty_level,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  '测试-日常会话场景',
  '日常生活中的高频词汇和场景对话',
  'scenario',
  true,
  true,
  0,
  0,
  null,
  'beginner',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 官方单词书3: 未上架（用于上架/下架功能测试）
INSERT INTO public.books (
  id,
  title,
  description,
  category,
  is_official,
  is_published,
  total_words,
  total_chapters,
  cover_url,
  difficulty_level,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000003',
  '测试-六级高级词汇',
  '大学英语六级考试高级词汇',
  'exam',
  true,
  false,
  0,
  0,
  null,
  'advanced',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 用户自定义单词书（用于自定义词库测试）
INSERT INTO public.books (
  id,
  title,
  description,
  category,
  is_official,
  is_published,
  total_words,
  total_chapters,
  cover_url,
  created_by,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000004',
  '测试-我的生词本',
  '用户收集的生词本',
  'custom',
  false,
  true,
  0,
  0,
  null,
  '00000000-0000-0000-0000-000000000001',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. 测试章节创建
-- ============================================

-- 为四级核心词汇创建章节
INSERT INTO public.chapters (id, book_id, title, description, order_index, created_at, updated_at) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '第1章', '基础词汇', 1, NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '第2章', '进阶词汇', 2, NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '第3章', '高级词汇', 3, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 为日常会话场景创建章节
INSERT INTO public.chapters (id, book_id, title, description, order_index, created_at, updated_at) VALUES
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002', '第1章', '问候与介绍', 1, NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', '第2章', '购物与点餐', 2, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. 测试单词创建
-- ============================================

-- 为四级核心词汇第1章添加测试单词
INSERT INTO public.words (word, phonetic, part_of_speech, definition, definition_en, collocation, collocation_en, example_sentence, example_sentence_en, chapter_id, book_id, order_index, created_at, updated_at) VALUES
  ('hello', '/həˈloʊ/', '感叹词', '你好；问候', 'A greeting', 'say hello', 'say hello to someone', 'Hello, how are you?', 'Hello, how are you today?', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, NOW(), NOW()),
  'world', '/wɜːrld/', '名词', '世界；地球', 'The earth', 'around the world', 'travel around the world', 'The world is beautiful.', 'I want to travel around the world.', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 2, NOW(), NOW()),
  'study', '/ˈstʌdi/', '动词', '学习；研究', 'To learn', 'study hard', 'study hard for exam', 'I study English every day.', 'I need to study hard for my exam.', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 3, NOW(), NOW()),
  'book', '/bʊk/', '名词', '书；书籍', 'A written work', 'read a book', 'read a good book', 'This is a good book.', 'I like to read books before bed.', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 4, NOW(), NOW()),
  'test', '/test/', '名词', '测试；考试', 'An examination', 'take a test', 'take a difficult test', 'The test is hard.', 'I have a test tomorrow.', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 5, NOW(), NOW()),
  ('apple', '/ˈæpl/', '名词', '苹果', 'A round fruit', 'eat an apple', 'eat a fresh apple', 'I like apples.', 'An apple a day keeps the doctor away.', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 6, NOW(), NOW()),
  'computer', '/kəmˈpjuːtər/', '名词', '电脑；计算机', 'Electronic device', 'use computer', 'use a computer for work', 'I use my computer every day.', 'This computer is very fast.', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 7, NOW(), NOW()),
  'happy', '/ˈhæpi/', '形容词', '快乐的；幸福的', 'Feeling pleasure', 'happy life', 'live a happy life', 'I am very happy today.', 'She has a happy family.', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 8, NOW(), NOW()),
  'learn', '/lɜːrn/', '动词', '学习；了解', 'To gain knowledge', 'learn English', 'learn English quickly', 'I want to learn new things.', 'Children learn very fast.', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 9, NOW(), NOW()),
  'teacher', '/ˈtiːtʃər/', '名词', '老师；教师', 'Person who teaches', 'good teacher', 'have a good teacher', 'She is a great teacher.', 'My teacher is very kind.', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 10, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 为日常会话场景第1章添加测试单词
INSERT INTO public.words (word, phonetic, part_of_speech, definition, definition_en, collocation, collocation_en, example_sentence, example_sentence_en, chapter_id, book_id, order_index, created_at, updated_at) VALUES
  ('good', '/ɡʊd/', '形容词', '好的；优秀的', 'Of high quality', 'good morning', 'say good morning', 'Good morning!', 'Have a good morning!', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002', 1, NOW(), NOW()),
  ('morning', '/ˈmɔːrnɪŋ/', '名词', '早晨；早上', 'Early part of the day', 'in the morning', 'wake up in the morning', 'Good morning!', 'I exercise in the morning.', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002', 2, NOW(), NOW()),
  ('thank', '/θæŋk/', '动词', '感谢；谢谢', 'To express gratitude', 'thank you', 'say thank you', 'Thank you very much.', 'I want to thank you.', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002', 3, NOW(), NOW()),
  ('you', '/juː/', '代词', '你；你们', 'The person being addressed', 'thank you', 'thank you for help', 'How are you?', 'You are welcome.', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002', 4, NOW(), NOW()),
  ('please', '/pliːz/', '感叹词', '请；劳驾', 'Used to make requests polite', 'please help', 'please help me', 'Please sit down.', 'Please help me with this.', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002', 5, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 更新单词书的单词数和章节数
UPDATE public.books
SET total_words = (SELECT COUNT(*) FROM public.words WHERE book_id = books.id),
    total_chapters = (SELECT COUNT(*) FROM public.chapters WHERE book_id = books.id)
WHERE id IN ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');

-- ============================================
-- 5. 测试学习记录创建（用于断点续学测试）
-- ============================================

-- 为用户1创建学习进度记录
INSERT INTO public.user_learning_progress (
  user_id,
  book_id,
  current_chapter_id,
  known_words,
  unknown_words,
  last_learned_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  ARRAY['hello', 'world']::text[],
  ARRAY['study', 'book', 'test']::text[],
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (user_id, book_id) DO NOTHING;

-- ============================================
-- 6. 测试邀请码创建（用于邀请注册测试）
-- ============================================

INSERT INTO public.invitation_codes (
  code,
  max_uses,
  used_count,
  expires_at,
  package_id,
  is_active,
  created_at,
  updated_at
) VALUES
  ('TEST2024', 100, 0, NOW() + INTERVAL '1 year', null, true, NOW(), NOW()),
  ('VIP2024', 50, 0, NOW() + INTERVAL '1 year', null, true, NOW(), NOW()),
  ('EXPIRED2024', 10, 0, NOW() - INTERVAL '1 day', null, true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 7. 测试完成提示
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE '测试数据准备完成！';
  RAISE NOTICE '====================================';
  RAISE NOTICE '测试用户信息：';
  RAISE NOTICE '- test-user1@example.com / Test123456 (普通用户)';
  RAISE NOTICE '- test-user2@example.com / Test123456 (普通用户)';
  RAISE NOTICE '- test-banned@example.com / Test123456 (受封禁用户)';
  RAISE NOTICE '';
  RAISE NOTICE '测试单词书：';
  RAISE NOTICE '- 四级核心词汇 (已上架)';
  RAISE NOTICE '- 日常会话场景 (已上架)';
  RAISE NOTICE '- 六级高级词汇 (未上架)';
  RAISE NOTICE '- 我的生词本 (用户自定义)';
  RAISE NOTICE '';
  RAISE NOTICE '测试邀请码：';
  RAISE NOTICE '- TEST2024 (有效)';
  RAISE NOTICE '- VIP2024 (有效)';
  RAISE NOTICE '- EXPIRED2024 (已过期)';
  RAISE NOTICE '====================================';
END $$;
