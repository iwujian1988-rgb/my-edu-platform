-- ============================================================================
-- 修复数据库函数类型不匹配问题
-- ============================================================================
-- 版本: v1.1
-- 日期: 2026-02-03
-- 问题: PostgreSQL 函数返回类型与实际列类型不匹配
-- 解决: 删除旧函数，使用显式类型转换重新创建
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 步骤 1: 删除旧函数（必须先删除才能修改返回类型）
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS get_unmarked_words(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS get_words_not_known(UUID, UUID, INTEGER);

DO $$
BEGIN
  RAISE NOTICE '✅ 已删除旧函数';
END
$$;

-- ----------------------------------------------------------------------------
-- 步骤 2: 重新创建函数（使用显式类型转换）
-- ----------------------------------------------------------------------------

-- 2.1 函数：获取完全未标记的单词（新逻辑）
CREATE FUNCTION get_unmarked_words(
  p_user_id UUID,
  p_book_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  id UUID,
  word TEXT,
  phonetic VARCHAR(255),
  definition VARCHAR(255),
  example_sentence TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id::UUID,
    w.word::TEXT,
    w.phonetic::VARCHAR(255),
    w.definition::VARCHAR(255),
    w.example_sentence::TEXT
  FROM words w
  WHERE w.book_id = p_book_id
    AND NOT EXISTS (
      -- [Upgrade] 两阶段系统：查询完全未标记的词（word_progress 表中没有记录）
      SELECT 1 FROM word_progress wp
      WHERE wp.word_id = w.id
        AND wp.user_id = p_user_id
    )
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_unmarked_words IS
'获取完全未标记的单词（两阶段系统 - 新功能）';

-- 2.2 函数：保留旧函数：获取 status != 'known' 的单词（向后兼容）
CREATE FUNCTION get_words_not_known(
  p_user_id UUID,
  p_book_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  id UUID,
  word TEXT,
  phonetic VARCHAR(255),
  definition VARCHAR(255),
  example_sentence TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id::UUID,
    w.word::TEXT,
    w.phonetic::VARCHAR(255),
    w.definition::VARCHAR(255),
    w.example_sentence::TEXT
  FROM words w
  WHERE w.book_id = p_book_id
    AND NOT EXISTS (
      -- [Legacy] v4.0 逻辑：只查询 status != 'known' 的词
      SELECT 1 FROM word_progress wp
      WHERE wp.word_id = w.id
        AND wp.user_id = p_user_id
        AND wp.status = 'known'
    )
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_words_not_known IS
'获取 status != known 的单词（v4.0 逻辑 - 向后兼容）';

-- ----------------------------------------------------------------------------
-- 步骤 3: 验证函数创建
-- ----------------------------------------------------------------------------

SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_unmarked_words', 'get_words_not_known');

-- ============================================================================
-- 迁移完成
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '数据库函数类型修复完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 已删除旧函数';
  RAISE NOTICE '✅ 已创建新函数（使用显式类型转换）';
  RAISE NOTICE '✅ 类型不匹配问题已解决';
  RAISE NOTICE '========================================';
END
$$;
