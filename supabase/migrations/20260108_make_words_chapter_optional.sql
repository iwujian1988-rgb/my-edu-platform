-- ============================================
-- 迁移文件: 让words表的chapter_id变为可选
-- 创建日期: 2026-01-08
-- 目的: 支持无章节的单词书（单词手册模式）
-- ============================================

-- 1. 将chapter_id改为可选（允许NULL）
ALTER TABLE words
ALTER COLUMN chapter_id DROP NOT NULL;

-- 2. 添加注释说明
COMMENT ON COLUMN words.chapter_id IS
'所属章节ID，如果为NULL则表示该单词属于默认章节或无章节模式';

-- 3. 添加book_id字段（如果不存在）
-- 用于无章节模式的单词，也能知道属于哪本书
DO $$
BEGIN
    -- 检查book_id列是否存在
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'words'
          AND column_name = 'book_id'
    ) THEN
        ALTER TABLE words
        ADD COLUMN book_id UUID REFERENCES books(id) ON DELETE CASCADE;

        -- 为已有的单词数据填充book_id（从所属章节获取）
        UPDATE words w
        SET book_id = (
            SELECT c.book_id
            FROM chapters c
            WHERE c.id = w.chapter_id
        )
        WHERE w.book_id IS NULL AND w.chapter_id IS NOT NULL;

        RAISE NOTICE '已添加book_id字段并填充数据';
    ELSE
        RAISE NOTICE 'book_id字段已存在，跳过';
    END IF;
END $$;

-- 4. 为无章节模式创建索引（优化查询）
CREATE INDEX IF NOT EXISTS words_book_id_idx ON words(book_id);

-- 5. 添加注释说明无章节模式的用途
COMMENT ON TABLE words IS
'单词表。支持两种模式：1)有章节模式(教材)：chapter_id非空；2)无章节模式(单词手册)：chapter_id为空';

-- ============================================
-- 验证查询
-- ============================================

-- 查看表结构
-- \d words

-- 查看现有的chapter_id非空约束是否已移除
SELECT
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'words'
  AND column_name = 'chapter_id';
