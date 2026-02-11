-- 1. 查询用户ID
SELECT id, email, raw_user_meta_data->>'phone' as phone 
FROM auth.users 
WHERE email = '15652936305@phone.xiaoyu.com' 
   OR raw_user_meta_data->>'phone' = '15652936305';

-- 2. 查询该用户最近的听写提交记录（按时间倒序，取前5条）
SELECT 
  id,
  article_id,
  total_words,
  correct_count,
  wrong_count,
  skipped_count,
  accuracy_rate,
  created_at
FROM speaker_dictation_submissions
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = '15652936305@phone.xiaoyu.com' 
  LIMIT 1
)
ORDER BY created_at DESC
LIMIT 5;

-- 3. 查询该用户在 speaker_ghost_words 表中的记录数
SELECT 
  COUNT(*) as total_ghost_words,
  COUNT(DISTINCT word) as unique_words,
  COUNT(DISTINCT article_id) as articles
FROM speaker_ghost_words
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = '15652936305@phone.xiaoyu.com' 
  LIMIT 1
);

-- 4. 查看生词本中每个单词出现次数的分布
SELECT 
  word,
  COUNT(*) as occurrence_count,
  STRING_AGG(DISTINCT sentence_id::text, ', ') as sentence_ids
FROM speaker_ghost_words
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = '15652936305@phone.xiaoyu.com' 
  LIMIT 1
)
GROUP BY word
ORDER BY occurrence_count DESC
LIMIT 10;
