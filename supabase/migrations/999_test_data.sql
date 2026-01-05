-- ============================================
-- 测试数据准备脚本
-- 用于登录与注册模块测试
-- ============================================

-- 注意：在执行此脚本前，请确保已经运行了 schema 和 seed_data 脚本

-- 1. 创建额外的测试邀请码
INSERT INTO invitation_codes (code, max_uses, used_count, is_active, expires_at, created_by, description)
VALUES
  -- 过期邀请码（用于测试用例 010）
  ('EXPIRED', 10, 0, true, '2024-01-01 00:00:00+00', 'system', '已过期的邀请码，用于测试'),

  -- 已用满的邀请码（用于测试用例 011）
  ('FULLCODE', 5, 5, true, NULL, 'system', '使用次数已达上限的邀请码，用于测试'),

  -- 即将过期的邀请码
  ('SOONEXPIRE', 100, 0, true, '2026-01-10 23:59:59+00', 'system', '即将过期的邀请码'),

  -- 有限次使用的邀请码
  ('LIMITED5', 5, 0, true, NULL, 'system', '仅限5次使用的邀请码'),
  ('LIMITED10', 10, 0, true, NULL, 'system', '仅限10次使用的邀请码')

ON CONFLICT (code) DO UPDATE SET
  max_uses = EXCLUDED.max_uses,
  used_count = EXCLUDED.used_count,
  is_active = EXCLUDED.is_active,
  expires_at = EXCLUDED.expires_at,
  description = EXCLUDED.description;


-- 2. 创建测试用户（通过 Supabase Auth）
-- 注意：这些用户需要通过注册流程创建，这里只提供准备数据

-- 清理旧的测试数据（可选）
-- DELETE FROM users WHERE phone_number LIKE '138%';
-- DELETE FROM user_quotas WHERE user_id IN (SELECT id FROM users WHERE phone_number LIKE '138%');
-- 注意：删除 auth.users 需要在 Supabase Dashboard 手动操作或使用 Admin API


-- 3. 创建测试用单词书（用于测试登录后的页面）
INSERT INTO books (id, title, description, category, is_official, total_words, difficulty_level, cover_url, metadata)
VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 'Test Vocabulary Book', 'Testing book for auth module', 'Testing', true, 100, 'beginner', NULL, '{"test": true}')
ON CONFLICT (id) DO NOTHING;


-- 4. 查看当前邀请码状态
SELECT
  code,
  max_uses,
  used_count,
  max_uses - used_count as remaining_uses,
  is_active,
  CASE
    WHEN expires_at IS NULL THEN '永不过期'
    WHEN expires_at < NOW() THEN '已过期'
    ELSE '有效至 ' || TO_CHAR(expires_at, 'YYYY-MM-DD HH24:MI:SS')
  END as expiry_status,
  description
FROM invitation_codes
ORDER BY created_at DESC;


-- 5. 查看当前用户统计
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as new_users_today
FROM users;


-- 6. 清理测试数据的辅助函数（可选使用）
/*
-- 清理所有测试用户（危险操作，谨慎使用！）
-- 需要先删除 auth.users，再删除 public.users

-- 删除测试 quota 记录
DELETE FROM user_quotas
WHERE user_id IN (
  SELECT id FROM users
  WHERE phone_number LIKE '138%'
     OR phone_number LIKE '139%'
);

-- 删除测试用户记录
DELETE FROM users
WHERE phone_number LIKE '138%'
   OR phone_number LIKE '139%';

-- 注意：还需要在 Supabase Dashboard -> Authentication -> Users 中手动删除对应的 auth.users 记录
*/


-- ============================================
-- 测试数据使用说明
-- ============================================

/*
测试邀请码列表：

1. TEST1234   - 正常邀请码，最多100次使用，永不过期
2. DEMO2024   - 正常邀请码，最多50次使用，过期时间 2026-12-31
3. BETA5000   - 正常邀请码，最多500次使用，永不过期
4. EXPIRED    - 已过期邀请码（用于测试过期验证）
5. FULLCODE   - 已用满邀请码（用于测试次数限制）
6. SOONEXPIRE - 即将过期的邀请码（2026-01-10）
7. LIMITED5   - 仅限5次使用的邀请码
8. LIMITED10  - 仅限10次使用的邀请码

测试账号（需要先注册）：
- 手机号: 13800138000  密码: test123456  邀请码: TEST1234
- 手机号: 13900139000  密码: password123  邀请码: DEMO2024

推荐测试顺序：
1. 使用 TEST1234 注册账号 13800138000
2. 使用 DEMO2024 注册账号 13900139000
3. 测试登录功能
4. 测试错误场景（使用 EXPIRED, FULLCODE 等邀请码）
5. 测试已注册手机号重复注册
6. 测试密码错误登录
7. 测试登出功能
*/
