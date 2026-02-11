-- 诊断 Speaker 数据

-- 1. 检查 speaker_articles 表是否存在
SELECT
    EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'speaker_articles'
    ) as articles_table_exists;

-- 2. 检查文章数量
SELECT COUNT(*) as article_count FROM speaker_articles;

-- 3. 查看前3篇文章
SELECT
    id,
    title,
    level,
    status,
    created_at
FROM speaker_articles
ORDER BY created_at DESC
LIMIT 3;

-- 4. 检查 RLS 策略
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'speaker_articles';
