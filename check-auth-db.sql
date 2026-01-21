-- 检查 Supabase Auth 数据库问题

-- 1. 检查 auth.users 表结构
SELECT
  'auth.users 表状态' as check_item,
  COUNT(*) as user_count
FROM auth.users;

-- 2. 检查最近的 Auth 用户
SELECT
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 3. 检查是否有未确认的用户
SELECT
  COUNT(*) as unconfirmed_count
FROM auth.users
WHERE email_confirmed_at IS NULL;

-- 4. 尝试创建测试用户（会显示具体错误）
DO $$
BEGIN
  -- 这个块会尝试创建用户并捕获错误
  -- 如果失败，错误会显示在日志中
END $$;

-- 5. 检查 auth schema 的触发器
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
ORDER BY trigger_name;
