-- 更新 Speaker 文章的 level 字段为 1-5 级
-- 日期: 2026-02-10

-- 1. 检查是否存在 CHECK 约束
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
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
END $$;

-- 2. 确保 level 字段是 INTEGER 类型（允许 1-5）
DO $$
BEGIN
    -- 添加 CHECK 约束，只允许 1-5
    ALTER TABLE speaker_articles
    ADD CONSTRAINT speaker_articles_level_check
    CHECK (level >= 1 AND level <= 5);

    RAISE NOTICE 'Added level check constraint (1-5)';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Level check constraint already exists';
END $$;

-- 3. 添加注释
COMMENT ON COLUMN speaker_articles.level IS '文章难度等级：1=入门级, 2=基础级, 3=进阶级, 4=高级, 5=专家级';
