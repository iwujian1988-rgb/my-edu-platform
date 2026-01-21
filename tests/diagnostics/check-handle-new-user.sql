-- ============================================
-- 检查handle_new_user函数定义
-- 在Supabase Dashboard的SQL Editor中运行
-- ============================================

-- 查看handle_new_user函数的完整定义
SELECT
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'handle_new_user'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 查看这个函数被哪些触发器调用
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE action_statement LIKE '%handle_new_user%';

-- 检查auth.users表上的所有触发器
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
    AND event_object_table = 'users'
ORDER BY trigger_name;
