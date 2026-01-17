-- ============================================
-- 自定义词库管理功能 - 索引优化
-- 创建时间：2026-01-15
-- 目的：优化章节管理、批量操作查询性能
-- ============================================

-- 1. 章节表复合索引（词库 + 排序）
-- 查询场景：获取某词库的所有章节并按 order_index 排序
-- 设计理由：
--   - 表格编辑视图需要频繁查询章节列表
--   - 章节管理需要按 order_index 排序
--   - 复合索引能避免 filesort，提升查询性能
DROP INDEX IF EXISTS idx_chapters_book_order;
CREATE INDEX idx_chapters_book_order
  ON chapters(book_id, order_index DESC);

-- 2. 单词表复合索引（章节 + 排序）
-- 查询场景：获取某章节的所有单词并按 order_index 排序
-- 设计理由：
--   - 表格视图分页查询（按章节筛选）
--   - 批量移动单词需要查询章节下的单词
--   - 复合索引直接利用索引顺序，避免额外排序
DROP INDEX IF EXISTS idx_words_chapter_order;
CREATE INDEX idx_words_chapter_order
  ON words(chapter_id, order_index ASC);

-- 3. 单词表复合索引（词库 + 单词）
-- 查询场景：批量操作时按 book_id 和 word 筛选
-- 设计理由：
--   - 批量删除时需要验证单词权限
--   - 批量移动时需要检查单词是否存在
--   - 避免全表扫描，显著提升批量操作性能
DROP INDEX IF EXISTS idx_words_book_word;
CREATE INDEX idx_words_book_word
  ON words(book_id, word);

-- ============================================
-- 添加 is_default 字段到 chapters 表
-- ============================================

-- 检查列是否存在，不存在则添加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'chapters'
    AND column_name = 'is_default'
  ) THEN
    ALTER TABLE chapters ADD COLUMN is_default BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 为现有数据设置 is_default（标题为"默认章节"的标记为 true）
UPDATE chapters
SET is_default = true
WHERE title = '默认章节';

-- ============================================
-- 索引使用验证（可选）
-- ============================================

-- 验证索引1：章节列表查询
-- EXPLAIN ANALYZE
-- SELECT * FROM chapters
-- WHERE book_id = 'book-uuid'
-- ORDER BY order_index DESC;
-- 预期：使用 idx_chapters_book_order 索引

-- 验证索引2：单词列表查询（按章节）
-- EXPLAIN ANALYZE
-- SELECT * FROM words
-- WHERE chapter_id = 'chapter-uuid'
-- ORDER BY order_index ASC
-- LIMIT 50;
-- 预期：使用 idx_words_chapter_order 索引

-- 验证索引3：批量操作权限检查
-- EXPLAIN ANALYZE
-- SELECT book_id, word FROM words
-- WHERE book_id = 'book-uuid' AND id IN ('word-1', 'word-2');
-- 预期：使用 idx_words_book_word 索引
