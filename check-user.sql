-- 检查手机号 19521529803 是否存在
SELECT
  '检查手机号 19521529803' as task;

-- 1. 检查 public.users 表
SELECT
  'public.users' as table_name,
  id,
  email,
  phone_number,
  created_at,
  is_banned,
  ban_reason
FROM users
WHERE phone_number = '19521529803';

-- 2. 检查 auth.users (通过邮箱)
-- 注意：这需要用 service_role 权限查询 auth schema
SELECT
  'auth.users (通过 email)' as source,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = '19521529803@phone.xiaoyu.com';

-- 3. 检查所有 users 中的手机号模式（前缀匹配）
SELECT
  '所有 195215 开头的手机号' as pattern,
  COUNT(*) as count
FROM users
WHERE phone_number LIKE '195215%';

-- 4. 显示所有 users 记录（最近10个）
SELECT
  '最近注册的10个用户' as recent_users,
  phone_number,
  email,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;
