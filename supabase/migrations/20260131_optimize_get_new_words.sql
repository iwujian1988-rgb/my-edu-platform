-- ============================================================================
-- 优化：创建数据库函数直接查询未学过的单词
-- ============================================================================
-- 版本: v1.1.0
-- 日期: 2026-01-31
-- 目的: 避免 getNewWordsForPlan 加载整个单词表到内存
-- 改进: 使用更高效的随机策略，避免 ORDER BY RANDOM() 的性能问题
-- ============================================================================

-- 删除旧函数（如果存在）
DROP FUNCTION IF EXISTS get_new_words_for_learning;

/**
 * 获取未学过的单词（用于新学词）
 *
 * 逻辑：
 * 1. 从 words 表中查询单词
 * 2. LEFT JOIN word_progress，只看 status = 'known' 的记录
 * 3. 过滤掉已标记为"认识"的单词
 * 4. 随机抽取指定数量（使用更高效的策略）
 *
 * 策略：先查询 p_limit * 20 个未学单词，然后在内存中随机选择 p_limit 个
 * 这样可以避免对大表使用 ORDER BY RANDOM() 的性能问题
 *
 * @param p_user_id 用户 ID
 * @param p_book_id 单词书 ID
 * @param p_limit 数量限制
 * @returns 单词列表（id, word, phonetic, definition）
 */
CREATE OR REPLACE FUNCTION get_new_words_for_learning(
  p_user_id UUID,
  p_book_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  word TEXT,
  phonetic TEXT,
  definition TEXT
)
LANGUAGE sql
STABLE
AS $$
  -- 先查询更多候选单词（按 id 排序，保证顺序一致）
  WITH candidate_words AS (
    SELECT w.id, w.word, w.phonetic, w.definition
    FROM words w
    LEFT JOIN word_progress wp
      ON wp.word_id = w.id
      AND wp.user_id = p_user_id
      AND wp.book_id = p_book_id
      AND wp.status = 'known'  -- 只有"认识"才算学过
    WHERE w.book_id = p_book_id
      AND wp.id IS NULL  -- 未学过
    ORDER BY w.id  -- 按 id 排序，保证一致性
    LIMIT p_limit * 20  -- 获取 20 倍数量作为候选池
  )
  -- 从候选池中随机选择
  SELECT cw.id, cw.word, cw.phonetic, cw.definition
  FROM candidate_words cw
  ORDER BY RANDOM()
  LIMIT p_limit;
$$;

-- 添加注释
COMMENT ON FUNCTION get_new_words_for_learning IS
'获取未学过的单词（用于新学词）。只排除 status = known 的单词，其他状态（fuzzy, unknown等）的词也会被返回。先查询 20 倍数量的候选池，然后随机选择，避免全表扫描的性能问题。';
