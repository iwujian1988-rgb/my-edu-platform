/**
 * 升级 Speaker 表结构以支持完整上传功能
 *
 * 变更：
 * 1. speaker_articles 添加 user_id 字段（记录文章创建者）
 * 2. speaker_articles 扩展 status 约束，支持 'published' 状态
 * 3. speaker_sentences 添加 text_en 字段（支持英文翻译）
 */

-- ========================================
-- 1. speaker_articles 添加 user_id 字段
-- ========================================

ALTER TABLE speaker_articles
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 添加索引以加速按用户查询文章
CREATE INDEX IF NOT EXISTS idx_speaker_articles_user_id ON speaker_articles(user_id);

-- 添加注释
COMMENT ON COLUMN speaker_articles.user_id IS '文章创建者 ID';

-- ========================================
-- 2. speaker_articles 扩展 status 约束
-- ========================================

-- 删除旧的 status 约束
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'speaker_articles'::regclass
      AND contype = 'c'
      AND conname LIKE '%status%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE speaker_articles DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE '已删除旧约束: %', constraint_name;
    END IF;
END $$;

-- 添加新的 status 约束（支持 'draft', 'published', 'active', 'archived'）
ALTER TABLE speaker_articles
ADD CONSTRAINT speaker_articles_status_check
CHECK (status IN ('draft', 'published', 'active', 'archived'));

-- 添加注释
COMMENT ON COLUMN speaker_articles.status IS '文章状态：draft(草稿), published(已发布), active(活跃), archived(已归档)';

-- ========================================
-- 3. speaker_sentences 添加 text_en 字段
-- ========================================

ALTER TABLE speaker_sentences
ADD COLUMN IF NOT EXISTS text_en TEXT;

-- 添加注释
COMMENT ON COLUMN speaker_sentences.text_en IS '句子英文翻译（可选）';

-- ========================================
-- 4. 验证结果
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '✅ Speaker 表结构升级完成！';
    RAISE NOTICE 'speaker_articles 新增字段: user_id';
    RAISE NOTICE 'speaker_articles status 约束: draft, published, active, archived';
    RAISE NOTICE 'speaker_sentences 新增字段: text_en';
END $$;
