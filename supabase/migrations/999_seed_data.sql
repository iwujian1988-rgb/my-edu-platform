-- ============================================
-- Seed Data for 小语笔记 (Xiaoyu Notes)
-- Purpose: Testing and Development
-- ============================================

-- Note: This script assumes themes and scenes are already inserted.
-- If not, uncomment the theme/scene insertions below.

-- ============================================
-- 1. INSERT SAMPLE BOOKS
-- ============================================

-- Business English Core
INSERT INTO books (
  id,
  title,
  description,
  cover_url,
  category,
  is_official,
  total_words,
  total_chapters,
  is_published,
  difficulty_level,
  language
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Business English Core',
  'Essential business vocabulary for professionals, covering meetings, negotiations, emails, and presentations.',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=600&fit=crop',
  'scenario',
  true,
  0, -- Will be updated by triggers
  0, -- Will be updated by triggers
  true,
  'intermediate',
  'en'
);

-- Daily Conversations
INSERT INTO books (
  id,
  title,
  description,
  cover_url,
  category,
  is_official,
  total_words,
  total_chapters,
  is_published,
  difficulty_level,
  language
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'Daily Conversations',
  'Common vocabulary for everyday situations including shopping, medical, and social interactions.',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
  'scenario',
  true,
  0,
  0,
  true,
  'beginner',
  'en'
);

-- TOEFL Core Vocabulary
INSERT INTO books (
  id,
  title,
  description,
  cover_url,
  category,
  is_official,
  total_words,
  total_chapters,
  is_published,
  difficulty_level,
  language
) VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  'TOEFL Core Vocabulary',
  'Essential TOEFL vocabulary organized by academic themes and test frequency.',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=600&fit=crop',
  'exam',
  true,
  0,
  0,
  true,
  'advanced',
  'en'
);

-- ============================================
-- 2. INSERT CHAPTERS
-- ============================================

-- Chapters for Business English Core
INSERT INTO chapters (id, book_id, title, order_index, theme_id, scene_id) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Business Meetings', 1,
   (SELECT id FROM themes WHERE name = '商务'),
   (SELECT id FROM scenes WHERE name = '会议')),

  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Negotiations', 2,
   (SELECT id FROM themes WHERE name = '商务'),
   (SELECT id FROM scenes WHERE name = '谈判')),

  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Email Communication', 3,
   (SELECT id FROM themes WHERE name = '商务'),
   (SELECT id FROM scenes WHERE name = '邮件')),

  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Presentations', 4,
   (SELECT id FROM themes WHERE name = '商务'),
   NULL);

-- Chapters for Daily Conversations
INSERT INTO chapters (id, book_id, title, order_index, theme_id, scene_id) VALUES
  ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'At the Restaurant', 1,
   (SELECT id FROM themes WHERE name = '旅游'),
   (SELECT id FROM scenes WHERE name = '餐厅')),

  ('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'Shopping', 2,
   (SELECT id FROM themes WHERE name = '日常'),
   (SELECT id FROM scenes WHERE name = '购物')),

  ('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', 'At the Airport', 3,
   (SELECT id FROM themes WHERE name = '旅游'),
   (SELECT id FROM scenes WHERE name = '机场')),

  ('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', 'Medical Assistance', 4,
   (SELECT id FROM themes WHERE name = '日常'),
   (SELECT id FROM scenes WHERE name = '医疗'));

-- ============================================
-- 3. INSERT WORDS
-- ============================================

-- Business English - Chapter 1: Business Meetings
INSERT INTO words (
  id, chapter_id, word, phonetic, definition, definition_en,
  collocation, collocation_en, example_sentence, example_sentence_en,
  part_of_speech, audio_url, order_index, difficulty_score
) VALUES
-- Word 1
(
  '770e8400-e29b-41d4-a716-446655440001',
  '660e8400-e29b-41d4-a716-446655440001',
  'agenda',
  '/əˈdʒendə/',
  'n. 议程，日程表',
  'A list of items to be discussed at a meeting',
  'set the agenda',
  'set the agenda',
  'Could you please send me the agenda before the meeting?',
  'Could you please send me the agenda before the meeting?',
  'noun',
  NULL,
  1,
  2
),

-- Word 2
(
  '770e8400-e29b-41d4-a716-446655440002',
  '660e8400-e29b-41d4-a716-446655440001',
  'consensus',
  '/kənˈsensəs/',
  'n. 一致意见，共识',
  'General agreement among a group of people',
  'reach a consensus',
  'reach a consensus',
  'After hours of discussion, we finally reached a consensus.',
  'After hours of discussion, we finally reached a consensus.',
  'noun',
  NULL,
  2,
  3
),

-- Word 3
(
  '770e8400-e29b-41d4-a716-446655440003',
  '660e8400-e29b-41d4-a716-446655440001',
  'facilitate',
  '/fəˈsɪlɪteɪt/',
  'v. 促进，帮助',
  'To make an action or process easier',
  'facilitate discussion',
  'facilitate discussion',
  'The moderator tried to facilitate a productive discussion.',
  'The moderator tried to facilitate a productive discussion.',
  'verb',
  NULL,
  3,
  3
);

-- Business English - Chapter 2: Negotiations
INSERT INTO words (
  id, chapter_id, word, phonetic, definition, definition_en,
  collocation, collocation_en, example_sentence, example_sentence_en,
  part_of_speech, audio_url, order_index, difficulty_score
) VALUES
(
  '770e8400-e29b-41d4-a716-446655440004',
  '660e8400-e29b-41d4-a716-446655440002',
  'compromise',
  '/ˈkɒmprəmaɪz/',
  'n. 妥协，折中；v. 妥协，让步',
  'An agreement made between two sides where each gives up something',
  'reach a compromise',
  'reach a compromise',
  'We need to reach a compromise that satisfies both parties.',
  'We need to reach a compromise that satisfies both parties.',
  'noun, verb',
  NULL,
  1,
  2
),

(
  '770e8400-e29b-41d4-a716-446655440005',
  '660e8400-e29b-41d4-a716-446655440002',
  'leverage',
  '/ˈliːvərɪdʒ/',
  'n. 杠杆作用；v. 利用',
  'To use something to maximum advantage',
  'leverage resources',
  'leverage resources',
  'We can leverage our existing relationships to get better terms.',
  'We can leverage our existing relationships to get better terms.',
  'noun, verb',
  NULL,
  2,
  3
),

(
  '770e8400-e29b-41d4-a716-446655440006',
  '660e8400-e29b-41d4-a716-446655440002',
  'concession',
  '/kənˈseʃn/',
  'n. 让步，特许权',
  'Something given up in a negotiation',
  'make a concession',
  'make a concession',
  'Both parties had to make concessions to reach the deal.',
  'Both parties had to make concessions to reach the deal.',
  'noun',
  NULL,
  3,
  3
);

-- Business English - Chapter 3: Email Communication
INSERT INTO words (
  id, chapter_id, word, phonetic, definition, definition_en,
  collocation, collocation_en, example_sentence, example_sentence_en,
  part_of_speech, audio_url, order_index, difficulty_score
) VALUES
(
  '770e8400-e29b-41d4-a716-446655440007',
  '660e8400-e29b-41d4-a716-446655440003',
  'abbreviate',
  '/əˈbriːvieɪt/',
  'v. 缩写，缩短',
  'To shorten a word or phrase',
  'abbreviate information',
  'abbreviate information',
  'Please abbreviate the report to one page.',
  'Please abbreviate the report to one page.',
  'verb',
  NULL,
  1,
  3
),

(
  '770e8400-e29b-41d4-a716-446655440008',
  '660e8400-e29b-41d4-a716-446655440003',
  'clarify',
  '/ˈklærɪfaɪ/',
  'v. 澄清，阐明',
  'To make something clearer or easier to understand',
  'clarify the situation',
  'clarify the situation',
  'Could you please clarify your position on this matter?',
  'Could you please clarify your position on this matter?',
  'verb',
  NULL,
  2,
  2
);

-- Daily Conversations - Chapter 1: At the Restaurant
INSERT INTO words (
  id, chapter_id, word, phonetic, definition, definition_en,
  collocation, collocation_en, example_sentence, example_sentence_en,
  part_of_speech, audio_url, order_index, difficulty_score
) VALUES
(
  '770e8400-e29b-41d4-a716-446655440009',
  '660e8400-e29b-41d4-a716-446655440005',
  'appetizer',
  '/ˈæpɪtaɪzər/',
  'n. 开胃菜',
  'A small dish served before the main course',
  'order an appetizer',
  'order an appetizer',
  'I would like to order the soup as an appetizer.',
  'I would like to order the soup as an appetizer.',
  'noun',
  NULL,
  1,
  2
),

(
  '770e8400-e29b-41d4-a716-446655440010',
  '660e8400-e29b-41d4-a716-446655440005',
  'recommendation',
  '/ˌrekəmenˈdeɪʃn/',
  'n. 推荐，建议',
  'A suggestion that something is good or suitable',
  'make a recommendation',
  'make a recommendation',
  'Can you make a recommendation for the main course?',
  'Can you make a recommendation for the main course?',
  'noun',
  NULL,
  2,
  2
);

-- ============================================
-- 4. INSERT INVITATION CODE (for testing)
-- ============================================

INSERT INTO invitation_codes (code, max_uses, used_count, is_active, expires_at)
VALUES
  ('TEST1234', 100, 0, true, NULL),
  ('DEMO2024', 50, 0, true, '2026-12-31 23:59:59+00'),
  ('BETA5000', 500, 0, true, NULL);

-- ============================================
-- 5. UPDATE BOOK WORD COUNTS (triggers should handle this)
-- ============================================

-- Force update counts manually to ensure accuracy
UPDATE books b
SET
  total_chapters = (SELECT COUNT(*) FROM chapters WHERE book_id = b.id),
  total_words = (SELECT COUNT(*) FROM words w
                 JOIN chapters c ON w.chapter_id = c.id
                 WHERE c.book_id = b.id);

UPDATE chapters c
SET word_count = (SELECT COUNT(*) FROM words WHERE chapter_id = c.id);

-- ============================================
-- END OF SEED DATA
-- ============================================

-- Verification Query
SELECT
  b.title AS book_title,
  COUNT(DISTINCT c.id) AS chapter_count,
  COUNT(w.id) AS word_count
FROM books b
LEFT JOIN chapters c ON b.id = c.book_id
LEFT JOIN words w ON c.id = w.chapter_id
GROUP BY b.id, b.title
ORDER BY b.title;
