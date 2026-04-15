-- ============================================
-- 检查受影响视频的 SQL 查询
-- 可以在 Supabase SQL Editor 中直接运行
-- ============================================

-- 1. 查看所有法语视频的单词统计
SELECT
  v.id,
  v.title,
  COUNT(vwc.id) as word_count,
  v.created_at
FROM videos v
LEFT JOIN video_word_cards vwc ON vwc.video_id = v.id
WHERE v.language = 'fr'
  AND v.status IN ('published', 'draft')
GROUP BY v.id, v.title, v.created_at
ORDER BY word_count ASC, v.created_at DESC;

-- 2. 找出单词数异常少的视频（可能有数据丢失）
-- 注意：这个阈值需要根据你的实际情况调整
SELECT
  v.id,
  v.title,
  COUNT(vwc.id) as word_count,
  vlm.material_json->'language_analysis'->>'vocabulary' as original_vocab,
  JSONB_ARRAY_LENGTH(vlm.material_json->'language_analysis'->>'vocabulary') as original_count
FROM videos v
LEFT JOIN video_word_cards vwc ON vwc.video_id = v.id
LEFT JOIN video_learning_materials vlm ON vlm.video_id = v.id
WHERE v.language = 'fr'
GROUP BY v.id, v.title, vlm.material_json
HAVING COUNT(vwc.id) < JSONB_ARRAY_LENGTH(vlm.material_json->'language_analysis'->>'vocabulary')
ORDER BY (JSONB_ARRAY_LENGTH(vlm.material_json->'language_analysis'->>'vocabulary') - COUNT(vwc.id)) DESC;

-- 3. 检查特定视频的原始单词数据
-- 替换 'your-video-id' 为实际视频 ID
SELECT
  jsonb_array_elements(material_json->'language_analysis'->'vocabulary')->>'french' as word
FROM video_learning_materials
WHERE video_id = 'your-video-id';

-- 4. 对比同一视频的原始单词 vs 数据库单词
SELECT
  original.word as original_word,
  db.word as db_word,
  CASE WHEN db.word IS NULL THEN 'MISSING' ELSE 'OK' END as status
FROM (
  SELECT
    jsonb_array_elements(material_json->'language_analysis'->'vocabulary')->>'french' as word
  FROM video_learning_materials
  WHERE video_id = 'your-video-id'
) original
LEFT JOIN (
  SELECT word
  FROM video_word_cards
  WHERE video_id = 'your-video-id'
) db ON LOWER(original.word) = LOWER(db.word);
