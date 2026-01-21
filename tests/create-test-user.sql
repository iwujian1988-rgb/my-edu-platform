-- 创建测试用户脚本
-- 手机号: 18710244186
-- 密码: Test123456

-- 首先检查用户是否已存在
SELECT id, phone_number, email, created_at
FROM users
WHERE phone_number = '18710244186';

-- 如果用户不存在，需要先创建Supabase Auth用户，然后插入到users表
-- 注意：这需要在Supabase SQL编辑器中执行

-- 1. 创建Auth用户（使用Supabase Auth函数）
-- 注意：密码应该已经通过Supabase Auth加密处理

-- 2. 插入到users表
INSERT INTO users (
  id,
  email,
  phone_number,
  full_name,
  created_at,
  updated_at
) VALUES (
  'a2afbb4f-dd9c-46bc-a780-b286c1527292',
  '18710244186@phone.xiaoyu.com',
  '18710244186',
  '测试用户1',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  phone_number = EXCLUDED.phone_number,
  email = EXCLUDED.email,
  updated_at = NOW();

-- 3. 创建用户配额
INSERT INTO user_quotas (
  user_id,
  daily_smart_import_limit,
  daily_smart_import_used
) VALUES (
  'a2afbb4f-dd9c-46bc-a780-b286c1527292',
  500,
  0
)
ON CONFLICT (user_id) DO NOTHING;

-- 验证用户创建成功
SELECT * FROM users WHERE phone_number = '18710244186';
