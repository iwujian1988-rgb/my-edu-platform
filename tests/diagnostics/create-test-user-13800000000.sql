-- ============================================
-- 创建测试用户（手机号: 13800000000）
-- 用于 REG-09 测试
-- ============================================

-- 注意：由于Supabase Auth的复杂性，此SQL可能无法直接创建auth用户
-- 推荐使用 setup-test-user-13800000000.js 脚本创建

-- ============================================
-- 方案1: 直接创建public.users记录（如果auth用户已存在）
-- ============================================

-- 首先检查用户是否已存在
SELECT id, phone_number, email FROM users WHERE phone_number = '13800000000';

-- 如果不存在，尝试插入（需要先有auth用户）
-- 注意：这个ID需要是一个有效的UUID，对应auth.users中的用户
INSERT INTO users (
  id,
  phone_number,
  email,
  full_name,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',  -- 确保这个ID在auth.users中存在
  '13800000000',
  '13800000000@phone.xiaoyu.com',
  '测试用户',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 方案2: 如果没有auth用户，需要先创建
-- ============================================

-- 检查auth用户是否存在（这个查询可能需要超级用户权限）
-- SELECT * FROM auth.users WHERE email = '13800000000@phone.xiaoyu.com';

-- ============================================
-- 方案3: 查看所有用户，了解当前状态
-- ============================================

-- 查看public.users中的所有用户
SELECT id, phone_number, email, full_name, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 查看是否有任何测试用户
SELECT COUNT(*) as total_users,
       COUNT(CASE WHEN phone_number LIKE '138%' THEN 1 END) as test_users
FROM users;

-- ============================================
-- 方案4: 使用已存在的用户
-- ============================================

-- 如果无法创建13800000000，可以修改测试使用已存在的用户
-- 查看最近创建的用户
SELECT id, phone_number, email
FROM users
WHERE phone_number IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- 方案5: 清理并重建（仅用于开发环境）
-- ============================================

-- ⚠️ 谨慎使用：会删除用户数据
-- DELETE FROM users WHERE phone_number = '13800000000';

-- 然后重新创建（需要确保没有外键约束问题）
-- INSERT INTO users (id, phone_number, email, full_name, created_at)
-- VALUES (
--   gen_random_uuid(),  -- 生成随机UUID
--   '13800000000',
--   '13800000000@phone.xiaoyu.com',
--   '测试用户',
--   NOW()
-- );

-- ============================================
-- 验证结果
-- ============================================

-- 确认用户已创建
SELECT phone_number, email, full_name,
       CASE WHEN phone_number = '13800000000' THEN '✅ 测试用户已创建'
            ELSE '❌ 测试用户未创建'
       END as status
FROM users
WHERE phone_number = '13800000000';
