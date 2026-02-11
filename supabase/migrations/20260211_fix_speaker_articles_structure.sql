/**
 * 修复 speaker_articles 表结构
 *
 * 添加缺失的 language 和 category 字段
 * 更新 level 约束为 1-5
 */

-- ========================================
-- 1. 添加缺失的字段
-- ========================================

-- 添加 language 字段
ALTER TABLE speaker_articles
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

-- 添加 category 字段
ALTER TABLE speaker_articles
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '心理';

-- ========================================
-- 2. 删除旧的 level 约束
-- ========================================

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'speaker_articles'::regclass
      AND contype = 'c'
      AND conname LIKE '%level%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE speaker_articles DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE '已删除旧约束: %', constraint_name;
    END IF;
END $$;

-- ========================================
-- 3. 添加新的 level 约束（1-5）
-- ========================================

ALTER TABLE speaker_articles
ADD CONSTRAINT speaker_articles_level_check
CHECK (level >= 1 AND level <= 5);

-- ========================================
-- 4. 添加注释
-- ========================================

COMMENT ON COLUMN speaker_articles.language IS '文章语言：en, pl, es, fr, de, ja';
COMMENT ON COLUMN speaker_articles.category IS '文章分类：健康, 心理, 成长, 学习, 社交, 生活';

-- ========================================
-- 5. 更新现有数据（如果有）
-- ========================================

UPDATE speaker_articles
SET language = 'en'
WHERE language IS NULL OR language = '';

UPDATE speaker_articles
SET category = '心理'
WHERE category IS NULL OR category = '';

-- ========================================
-- 6. 验证结果
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '✅ speaker_articles 表结构修复完成！';
    RAISE NOTICE '字段：id, level, language, category, title, source_url, audio_url, image_url, has_preroll_ad, total_sentences, duration_seconds, word_count, json_data, status, created_at, updated_at';
END $$;
