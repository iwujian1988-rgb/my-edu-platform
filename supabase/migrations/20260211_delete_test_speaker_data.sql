/**
 * 删除早期测试数据
 *
 * 删除通过 seed 脚本插入的4篇测试文章
 */

-- ========================================
-- 1. 删除测试文章的句子数据
-- ========================================

DELETE FROM speaker_sentences
WHERE article_id IN (
  SELECT id FROM speaker_articles
  WHERE title IN (
    'Where will you be twenty years from now',
    'Dont get caught in the boiling frog scenario',
    'Success depends not on IQ, but on perseverance',
    'How to maintain a long-lasting friendship'
  )
);

-- ========================================
-- 2. 删除测试文章
-- ========================================

DELETE FROM speaker_articles
WHERE title IN (
  'Where will you be twenty years from now',
  'Dont get caught in the boiling frog scenario',
  'Success depends not on IQ, but on perseverance',
  'How to maintain a long-lasting friendship'
);

-- ========================================
-- 3. 验证删除结果
-- ========================================

DO $$
DECLARE
    article_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO article_count FROM speaker_articles;

    RAISE NOTICE '✅ 测试数据已删除！';
    RAISE NOTICE '📊 剩余文章数: %', article_count;
    RAISE NOTICE '现在可以在后台添加真实的 Speaker 文章了';
END $$;
