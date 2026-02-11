/**
 * 演说家模块 - 测试数据插入脚本
 *
 * 插入 2 篇测试文章（Level 2 和 Level 3 各一篇）
 */

-- ========================================
-- 插入测试文章 1：Level 2（初中）
-- ========================================
INSERT INTO speaker_articles (
  id,
  level,
  title,
  source_url,
  audio_url,
  image_url,
  has_preroll_ad,
  total_sentences,
  duration_seconds,
  word_count,
  json_data,
  status
) VALUES (
  uuid_generate_v4(),
  2,
  'A Day at the Park',
  'https://example.com/article1',
  'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',  -- 示例音频
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800',
  false,
  5,
  45,
  62,
  '{
    "sentences": [
      {
        "id": "s1",
        "sentence_index": 0,
        "text": "Yesterday, I went to the park near my house.",
        "start_time": 0.0,
        "end_time": 5.2
      },
      {
        "id": "s2",
        "sentence_index": 1,
        "text": "The weather was beautiful and the sun was shining brightly.",
        "start_time": 5.2,
        "end_time": 10.8
      },
      {
        "id": "s3",
        "sentence_index": 2,
        "text": "I saw many children playing on the swings and slides.",
        "start_time": 10.8,
        "end_time": 16.5
      },
      {
        "id": "s4",
        "sentence_index": 3,
        "text": "Some people were having picnics on the green grass.",
        "start_time": 16.5,
        "end_time": 21.3
      },
      {
        "id": "s5",
        "sentence_index": 4,
        "text": "I felt very happy and relaxed walking there.",
        "start_time": 21.3,
        "end_time": 26.0
      }
    ]
  }'::jsonb,
  'active'
);

-- ========================================
-- 插入测试文章 2：Level 3（高中）
-- ========================================
INSERT INTO speaker_articles (
  id,
  level,
  title,
  source_url,
  audio_url,
  image_url,
  has_preroll_ad,
  total_sentences,
  duration_seconds,
  word_count,
  json_data,
  status
) VALUES (
  uuid_generate_v4(),
  3,
  'The Importance of Reading',
  'https://example.com/article2',
  'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',  -- 示例音频
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
  false,
  6,
  60,
  98,
  '{
    "sentences": [
      {
        "id": "s1",
        "sentence_index": 0,
        "text": "Reading is one of the most important skills a person can develop.",
        "start_time": 0.0,
        "end_time": 6.5
      },
      {
        "id": "s2",
        "sentence_index": 1,
        "text": "It opens doors to new worlds and expands our understanding of life.",
        "start_time": 6.5,
        "end_time": 12.8
      },
      {
        "id": "s3",
        "sentence_index": 2,
        "text": "Through books, we can travel to distant places without leaving our homes.",
        "start_time": 12.8,
        "end_time": 19.2
      },
      {
        "id": "s4",
        "sentence_index": 3,
        "text": "We can learn about different cultures, histories, and perspectives.",
        "start_time": 19.2,
        "end_time": 25.5
      },
      {
        "id": "s5",
        "sentence_index": 4,
        "text": "Reading also improves our vocabulary and communication skills.",
        "start_time": 25.5,
        "end_time": 31.0
      },
      {
        "id": "s6",
        "sentence_index": 5,
        "text": "Therefore, everyone should make reading a daily habit.",
        "start_time": 31.0,
        "end_time": 36.5
      }
    ]
  }'::jsonb,
  'active'
);

-- ========================================
-- 插入测试文章 3：Level 2（初中）- 更多句子用于测试
-- ========================================
INSERT INTO speaker_articles (
  id,
  level,
  title,
  source_url,
  audio_url,
  image_url,
  has_preroll_ad,
  total_sentences,
  duration_seconds,
  word_count,
  json_data,
  status
) VALUES (
  uuid_generate_v4(),
  2,
  'My Best Friend',
  'https://example.com/article3',
  'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
  false,
  7,
  50,
  85,
  '{
    "sentences": [
      {
        "id": "s1",
        "sentence_index": 0,
        "text": "I have a best friend named Tom.",
        "start_time": 0.0,
        "end_time": 3.5
      },
      {
        "id": "s2",
        "sentence_index": 1,
        "text": "We have known each other since kindergarten.",
        "start_time": 3.5,
        "end_time": 7.8
      },
      {
        "id": "s3",
        "sentence_index": 2,
        "text": "Tom is tall and handsome with short black hair.",
        "start_time": 7.8,
        "end_time": 12.3
      },
      {
        "id": "s4",
        "sentence_index": 3,
        "text": "He is very kind and always helps others.",
        "start_time": 12.3,
        "end_time": 16.8
      },
      {
        "id": "s5",
        "sentence_index": 4,
        "text": "We often play basketball together on weekends.",
        "start_time": 16.8,
        "end_time": 21.5
      },
      {
        "id": "s6",
        "sentence_index": 5,
        "text": "Sometimes we study at the library after school.",
        "start_time": 21.5,
        "end_time": 26.2
      },
      {
        "id": "s7",
        "sentence_index": 6,
        "text": "I am lucky to have such a wonderful friend.",
        "start_time": 26.2,
        "end_time": 31.0
      }
    ]
  }'::jsonb,
  'active'
);

-- ========================================
-- 显示成功提示
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ 测试数据插入成功！';
  RAISE NOTICE '已插入 3 篇测试文章：';
  RAISE NOTICE '  - A Day at the Park (Level 2, 5 sentences)';
  RAISE NOTICE '  - The Importance of Reading (Level 3, 6 sentences)';
  RAISE NOTICE '  - My Best Friend (Level 2, 7 sentences)';
  RAISE NOTICE '';
  RAISE NOTICE '现在可以刷新浏览器访问 http://localhost:3000/speaker';
END $$;
