-- 修复历史数据的 SQL 脚本
-- 在 Supabase SQL Editor 中运行

-- 第一步：查看受影响的视频
SELECT
  v.id,
  v.title,
  COUNT(vwc.id) as current_word_count,
  created_at
FROM videos v
LEFT JOIN video_word_cards vwc ON vwc.video_id = v.id
WHERE v.language = 'fr'
GROUP BY v.id, v.title, v.created_at
ORDER BY current_word_count ASC;

-- 这个脚本只用于查看，不执行修改
-- 如需修复，需要使用 Node.js 脚本处理逻辑
