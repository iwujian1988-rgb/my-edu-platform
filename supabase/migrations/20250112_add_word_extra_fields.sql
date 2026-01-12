-- 添加单词辅助字段
-- 添加同义词、相关词、派生词、记忆方法字段

-- 添加 synonyms（同义词）字段
ALTER TABLE words
ADD COLUMN IF NOT EXISTS synonyms JSONB;

-- 添加 related_words（相关词）字段
ALTER TABLE words
ADD COLUMN IF NOT EXISTS related_words JSONB;

-- 添加 derived_words（派生词）字段
ALTER TABLE words
ADD COLUMN IF NOT EXISTS derived_words JSONB;

-- 添加 memory_method（记忆方法）字段
ALTER TABLE words
ADD COLUMN IF NOT EXISTS memory_method TEXT;

-- 添加注释
COMMENT ON COLUMN words.synonyms IS '同义词列表，存储为JSON数组';
COMMENT ON COLUMN words.related_words IS '相关词列表，存储为JSON对象数组';
COMMENT ON COLUMN words.derived_words IS '派生词列表，存储为JSON对象数组';
COMMENT ON COLUMN words.memory_method IS '记忆方法或记忆技巧';
