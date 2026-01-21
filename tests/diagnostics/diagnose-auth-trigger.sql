-- ============================================
-- Supabase Auth 诊断SQL脚本
-- 在Supabase Dashboard的SQL Editor中运行
-- ============================================

-- 1. 检查auth.users表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'auth'
    AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. 检查auth相关的触发器
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
    AND event_object_table = 'users';

-- 3. 检查public.users表上的触发器
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
    AND event_object_table = 'users';

-- 4. 尝试直接插入auth.users（绕过Auth API）
-- 注意：这会失败，但会显示具体错误信息
DO $$
BEGIN
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'test@example.com',
        crypt('testpassword', gen_salt('bf')),
        now(),
        '{}'::jsonb,
        now(),
        now()
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '插入失败: %, SQLSTATE: %', SQLERRM, SQLSTATE;
END $$;

-- 5. 检查是否有数据库函数错误
-- 查找可能在auth.users INSERT时被调用的函数
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND (
        p.proname LIKE '%user%'
        OR p.proname LIKE '%auth%'
        OR p.proname LIKE '%sync%'
    )
LIMIT 20;

-- 6. 检查public.users表是否有外键约束指向auth.users
SELECT
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON c.connamespace = n.oid
WHERE n.nspname = 'public'
    AND conrelid::regclass::text = 'users'
    AND contype = 'f';

-- 7. 检查最近的数据库错误日志
SELECT *
FROM pg_stat_statements
WHERE query LIKE '%INSERT INTO auth.users%'
    OR query LIKE '%INSERT INTO public.users%'
ORDER BY total_time DESC
LIMIT 10;
