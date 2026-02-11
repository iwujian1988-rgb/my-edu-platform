/**
 * 演说家模块 - 替换测试音频数据
 *
 * 删除现有测试数据，导入3篇新的真实音频数据：
 * 1. How to maintain a long-lasting friendship (Level 1)
 * 2. Success depends not on IQ, but on perseverance (Level 2)
 * 3. Dont get caught in the boiling frog scenario (Level 3)
 */

-- ========================================
-- 第一步：删除现有测试数据
-- ========================================
DELETE FROM speaker_sentences WHERE article_id IN (
  SELECT id FROM speaker_articles WHERE title IN (
    'A Day at the Park',
    'The Importance of Reading',
    'Why are billionaires building bunkers',
    'Scared of speaking English',
    'What English phrases really mean',
    'Is social media dead',
    'Is it OK to disagree',
    'Warming your house the green way just got more expensive',
    'All these data centers are gonna fry my electric bill',
    'Americas next top Fed Chair',
    'A huge EU India deal Heated Rivalry and a hefty price hike',
    'Hawaiis worker shortage goes NUTS',
    'Why isnt corporate America standing up to Trump'
  )
);

DELETE FROM speaker_articles WHERE title IN (
  'A Day at the Park',
  'The Importance of Reading',
  'Why are billionaires building bunkers',
  'Scared of speaking English',
  'What English phrases really mean',
  'Is social media dead',
  'Is it OK to disagree',
  'Warming your house the green way just got more expensive',
  'All these data centers are gonna fry my electric bill',
  'Americas next top Fed Chair',
  'A huge EU India deal Heated Rivalry and a hefty price hike',
  'Hawaiis worker shortage goes NUTS',
  'Why isnt corporate America standing up to Trump'
);

-- ========================================
-- 第二步：插入新数据 - Level 1
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
  1,
  'How to maintain a long-lasting friendship',
  '',
  '/audio/speaker/level1/How to maintain a long-lasting friendship.mp3',
  NULL,
  false,
  41,
  214,
  520,
  '{
    "meta": {
      "level": 1,
      "title": "How to maintain a long-lasting friendship",
      "source_url": "",
      "audio_filename": "How to maintain a long-lasting friendship.mp3",
      "image_filename": "",
      "has_preroll_ad": false,
      "status": "active"
    },
    "sentences": [
      {"id": 1, "sentence_index": 0, "text": "I'\''ve moved about 20 times in my life, and each time that I moved to a new neighborhood,", "text_en": "I'\''ve moved about 20 times in my life, and each time that I moved to a new neighborhood,", "start_time": 0.11, "end_time": 4.99},
      {"id": 2, "sentence_index": 1, "text": "a new city, a new country, it seems to get harder and harder to sustain the friendships", "text_en": "a new city, a new country, it seems to get harder and harder to sustain the friendships", "start_time": 5.27, "end_time": 9.69},
      {"id": 3, "sentence_index": 2, "text": "I left behind. But right now, sustaining those friendships seems especially important,", "text_en": "I left behind. But right now, sustaining those friendships seems especially important,", "start_time": 9.69, "end_time": 14.55},
      {"id": 4, "sentence_index": 3, "text": "and especially difficult. So I'\''m wondering, what is manageable? How can I keep those", "text_en": "and especially difficult. So I'\''m wondering, what is manageable? How can I keep those", "start_time": 15.09, "end_time": 20.43},
      {"id": 5, "sentence_index": 4, "text": "friendships afloat without getting overwhelmed?", "text_en": "friendships afloat without getting overwhelmed?", "start_time": 20.43, "end_time": 22.57},
      {"id": 6, "sentence_index": 5, "text": "To find out, I turn to my two most trusted sources, data and my mum. Now, since she", "text_en": "To find out, I turn to my two most trusted sources, data and my mum. Now, since she", "start_time": 25.24, "end_time": 31.64},
      {"id": 7, "sentence_index": 6, "text": "takes being on camera, this puppet is going to be as good as it gets. But before she", "text_en": "takes being on camera, this puppet is going to be as good as it gets. But before she", "start_time": 31.64, "end_time": 35.36},
      {"id": 8, "sentence_index": 7, "text": "weighs in, I wanted to look at the studies on how friendships fall apart, in the hopes", "text_en": "weighs in, I wanted to look at the studies on how friendships fall apart, in the hopes", "start_time": 35.36, "end_time": 39.74},
      {"id": 9, "sentence_index": 8, "text": "that I might be able to avoid some of those pitfalls. According to one study, friendships", "text_en": "that I might be able to avoid some of those pitfalls. According to one study, friendships", "start_time": 39.74, "end_time": 44.64},
      {"id": 10, "sentence_index": 9, "text": "often dissolve because of a lack of opportunity to meet, hang out and connect, which may explain", "text_en": "often dissolve because of a lack of opportunity to meet, hang out and connect, which may explain", "start_time": 44.64, "end_time": 49.92},
      {"id": 11, "sentence_index": 10, "text": "why after a year of isolation, some of my friendships fall like they'\''re hanging on by", "text_en": "why after a year of isolation, some of my friendships fall like they'\''re hanging on by", "start_time": 49.92, "end_time": 54.1},
      {"id": 12, "sentence_index": 11, "text": "a thread. That same research have made headlines with the finding that we lose half of our", "text_en": "a thread. That same research have made headlines with the finding that we lose half of our", "start_time": 54.1, "end_time": 58.9},
      {"id": 13, "sentence_index": 12, "text": "friendships every seven years. Now, before you start doom scrolling through your contact", "text_en": "friendships every seven years. Now, before you start doom scrolling through your contact", "start_time": 58.9, "end_time": 62.84},
      {"id": 14, "sentence_index": 13, "text": "list, you should know that'\''s not quite as severe as it sounds. Over those seven years,", "text_en": "list, you should know that'\''s not quite as severe as it sounds. Over those seven years,", "start_time": 62.84, "end_time": 67.0},
      {"id": 15, "sentence_index": 14, "text": "the size of our friendship group actually stays pretty stable. So, if you have 20 or 30", "text_en": "the size of our friendship group actually stays pretty stable. So, if you have 20 or 30", "start_time": 67.14, "end_time": 72.14},
      {"id": 16, "sentence_index": 15, "text": "good friends now, seven years later, you'\''ll still probably have 20 or 30 good friends.", "text_en": "good friends now, seven years later, you'\''ll still probably have 20 or 30 good friends.", "start_time": 72.14, "end_time": 76.66},
      {"id": 17, "sentence_index": 16, "text": "The catch though is that 52% of those faces will be different. Over seven years, we will", "text_en": "The catch though is that 52% of those faces will be different. Over seven years, we will", "start_time": 76.86, "end_time": 82.12},
      {"id": 18, "sentence_index": 17, "text": "replace many of the people in our network with new ones. As someone who has had to work", "text_en": "replace many of the people in our network with new ones. As someone who has had to work", "start_time": 82.12, "end_time": 86.94},
      {"id": 19, "sentence_index": 18, "text": "more and more from home, the opportunity to go out and make new friends is pretty limited.", "text_en": "more and more from home, the opportunity to go out and make new friends is pretty limited.", "start_time": 86.94, "end_time": 91.46},
      {"id": 20, "sentence_index": 19, "text": "It'\''s a luxury I don'\''t often have. And the research on the formation of new friends suggests that", "text_en": "It'\''s a luxury I don'\''t often have. And the research on the formation of new friends suggests that", "start_time": 91.94, "end_time": 96.28},
      {"id": 21, "sentence_index": 20, "text": "this takes time, a lot of time. A recent study found that you have to spend between 40 and 60", "text_en": "this takes time, a lot of time. A recent study found that you have to spend between 40 and 60", "start_time": 96.28, "end_time": 102.84},
      {"id": 22, "sentence_index": 21, "text": "hours with someone before they can go from an acquaintance to a casual friend. They get upgraded", "text_en": "hours with someone before they can go from an acquaintance to a casual friend. They get upgraded", "start_time": 102.84, "end_time": 108.0},
      {"id": 23, "sentence_index": 22, "text": "to a fully pledged friend at around 80 to 100 hours and get elevated to a best friend after you", "text_en": "to a fully pledged friend at around 80 to 100 hours and get elevated to a best friend after you", "start_time": 108.0, "end_time": 114.79},
      {"id": 24, "sentence_index": 23, "text": "spend at least 200 hours of quality time together. And the emphasis here is on quality time.", "text_en": "spend at least 200 hours of quality time together. And the emphasis here is on quality time.", "start_time": 114.79, "end_time": 120.85},
      {"id": 25, "sentence_index": 24, "text": "You might say hi to a barista every morning or be polite to a co-worker, but you wouldn'\''t", "text_en": "You might say hi to a barista every morning or be polite to a co-worker, but you wouldn'\''t", "start_time": 121.07, "end_time": 125.33},
      {"id": 26, "sentence_index": 25, "text": "necessarily invite either one over for dinner. I was feeling a little bit daunted by all of these", "text_en": "necessarily invite either one over for dinner. I was feeling a little bit daunted by all of these", "start_time": 125.33, "end_time": 130.83},
      {"id": 27, "sentence_index": 26, "text": "numbers until I spoke to my mum who has a more optimistic take on all of this. A friendship is", "text_en": "numbers until I spoke to my mum who has a more optimistic take on all of this. A friendship is", "start_time": 130.83, "end_time": 136.37},
      {"id": 28, "sentence_index": 27, "text": "essentially a renewed life. How does a friendship start? The first thing is to know that person.", "text_en": "essentially a renewed life. How does a friendship start? The first thing is to know that person.", "start_time": 136.37, "end_time": 142.61},
      {"id": 29, "sentence_index": 28, "text": "If you don'\''t want to know these people, if you don'\''t open a window of communication,", "text_en": "If you don'\''t want to know these people, if you don'\''t open a window of communication,", "start_time": 142.61, "end_time": 148.47},
      {"id": 30, "sentence_index": 29, "text": "you will never become friends of them. You have to start. If you want to be isolated,", "text_en": "you will never become friends of them. You have to start. If you want to be isolated,", "start_time": 149.17, "end_time": 154.13},
      {"id": 31, "sentence_index": 30, "text": "you just shut your windows and look at them and they don'\''t look at you.", "text_en": "you just shut your windows and look at them and they don'\''t look at you.", "start_time": 154.53, "end_time": 158.21},
      {"id": 32, "sentence_index": 31, "text": "Okay, so yes, if I really, really want to make a new friendship, I could go out and make the effort", "text_en": "Okay, so yes, if I really, really want to make a new friendship, I could go out and make the effort", "start_time": 159.01, "end_time": 164.17},
      {"id": 33, "sentence_index": 32, "text": "to make a new friend by say knocking on my neighbor'\''s door who plays really good music a bit too loudly.", "text_en": "to make a new friend by say knocking on my neighbor'\''s door who plays really good music a bit too loudly.", "start_time": 164.17, "end_time": 169.79},
      {"id": 34, "sentence_index": 33, "text": "But what about my current crop of friends? Are we all doomed just because we don'\''t get the", "text_en": "But what about my current crop of friends? Are we all doomed just because we don'\''t get the", "start_time": 169.79, "end_time": 174.59},
      {"id": 35, "sentence_index": 34, "text": "chance to hang out like we used to? I think yes, with the friends, the distance get far", "text_en": "chance to hang out like we used to? I think yes, with the friends, the distance get far", "start_time": 174.59, "end_time": 180.61},
      {"id": 36, "sentence_index": 35, "text": "than and far that if you'\''re not meeting them. But it also shows you the ones that they don'\''t", "text_en": "than and far that if you'\''re not meeting them. But it also shows you the ones that they don'\''t", "start_time": 180.61, "end_time": 188.23},
      {"id": 37, "sentence_index": 36, "text": "disappear because of their time or the distance. They will be there for you if you need them.", "text_en": "disappear because of their time or the distance. They will be there for you if you need them.", "start_time": 188.23, "end_time": 194.61},
      {"id": 38, "sentence_index": 37, "text": "So the special friends on this difficult time shows you who cares and who is a good person or", "text_en": "So the special friends on this difficult time shows you who cares and who is a good person or", "start_time": 194.61, "end_time": 202.35},
      {"id": 39, "sentence_index": 38, "text": "a good friend. I think she'\''s right. I don'\''t think there'\''s a magical formula or mythical number of", "text_en": "a good friend. I think she'\''s right. I don'\''t think there'\''s a magical formula or mythical number of", "start_time": 202.35, "end_time": 208.59},
      {"id": 40, "sentence_index": 39, "text": "hours to chase. This just takes time and effort. So if you'\''ll excuse me, I have a good friend that I", "text_en": "hours to chase. This just takes time and effort. So if you'\''ll excuse me, I have a good friend that I", "start_time": 208.59, "end_time": 214.01},
      {"id": 41, "sentence_index": 40, "text": "need to call.", "text_en": "need to call.", "start_time": 214.01, "end_time": 214.49}
    ]
  }'::jsonb,
  'active'
);

-- ========================================
-- 由于 SQL 文件大小限制，Level 2 和 Level 3 的数据需要手动导入
-- ========================================

COMMENT ON TABLE speaker_articles IS '演说家文章表 - 已替换为新的测试音频数据';
