-- 添加额外字段到words表
-- 执行时间: 2025-01-12

-- 1. 添加 synonyms（同义词）字段
ALTER TABLE words
ADD COLUMN IF NOT EXISTS synonyms JSONB;

-- 2. 添加 related_words（相关词）字段
ALTER TABLE words
ADD COLUMN IF NOT EXISTS related_words JSONB;

-- 3. 添加 derived_words（派生词）字段
ALTER TABLE words
ADD COLUMN IF NOT EXISTS derived_words JSONB;

-- 4. 添加 memory_method（记忆方法）字段
ALTER TABLE words
ADD COLUMN IF NOT EXISTS memory_method TEXT;

COMMENT ON COLUMN words.synonyms IS '同义词列表';
COMMENT ON COLUMN words.related_words IS '相关词列表';
COMMENT ON COLUMN words.derived_words IS '派生词列表';
COMMENT ON COLUMN words.memory_method IS '记忆方法';
