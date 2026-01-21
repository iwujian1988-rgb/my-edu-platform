-- ============================================
-- 在Supabase Dashboard的SQL Editor中运行
-- 找出Supabase Auth用户创建失败的根本原因
-- ============================================

-- 第1步：检查auth.users表的触发器
SELECT
    '═══ auth.users触发器 ═══' as section;
SELECT
    trigger_name,
    event_manipulation as event,
    action_timing as timing,
    action_statement as action
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
    AND event_object_table = 'users';

-- 第2步：检查public.users表的触发器
SELECT
    '═══ public.users触发器 ═══' as section;
SELECT
    trigger_name,
    event_manipulation as event,
    action_timing as timing,
    action_statement as action
FROM information_schema.triggers
WHERE event_object_schema = 'public'
    AND event_object_table = 'users';

-- 第3步：检查所有触发器函数
SELECT
    '═══ 触发器函数 ═══' as section;
SELECT
    p.proname as function_name,
    n.nspname as schema,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%handle_new_user%'
    OR p.proname LIKE '%auth_%'
    OR p.proname LIKE '%sync_%'
ORDER BY p.proname;

-- 第4步：检查public.users表的外键约束
SELECT
    '═══ 外键约束 ═══' as section;
SELECT
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_def
FROM pg_constraint c
JOIN pg_namespace n ON c.connamespace = n.oid
WHERE conrelid::regclass::text = 'public.users'
    AND contype = 'f';

-- 第5步：检查public.users表的结构
SELECT
    '═══ public.users表结构 ═══' as section;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'users'
ORDER BY ordinal_position;

-- 第6步：检查auth.users表的结构
SELECT
    '═══ auth.users表结构 ═══' as section;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'auth'
    AND table_name = 'users'
ORDER BY ordinal_position;

-- 第7步：检查是否有自定义的handle_new_user函数
SELECT
    '═══ handle_new_user函数 ═══' as section;
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user';

-- 第8步：查看最近的auth用户
SELECT
    '═══ 最近的auth用户 ═══' as section;
SELECT
    id,
    email,
    created_at,
    updated_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 第9步：检查public和auth用户是否匹配
SELECT
    '═══ 数据一致性检查 ═══' as section;
SELECT
    (SELECT COUNT(*) FROM auth.users) as auth_users_count,
    (SELECT COUNT(*) FROM public.users) as public_users_count,
    (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM public.users) as difference;

-- 第10步：查找可能的错误日志
SELECT
    '═══ 数据库函数列表 ═══' as section;
SELECT
    n.nspname as schema_name,
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('public', 'auth')
    AND (
        p.proname LIKE '%user%'
        OR p.proname LIKE '%auth%'
        OR p.proname LIKE '%sync%'
        OR p.proname LIKE '%trigger%'
    )
ORDER BY n.nspname, p.proname;
