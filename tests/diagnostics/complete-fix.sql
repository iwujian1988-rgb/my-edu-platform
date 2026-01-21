-- 完整修复脚本
-- 基于当前邀请码状态

-- 1. 检查EXPIRED2024是否存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM invitation_codes WHERE code = 'EXPIRED2024') THEN
    INSERT INTO invitation_codes (code, is_active, max_uses, used_count, expires_at, created_at)
    VALUES ('EXPIRED2024', true, 10000, 0, '2020-01-01 00:00:00+00', NOW());
    RAISE NOTICE 'EXPIRED2024邀请码已创建';
  ELSE
    UPDATE invitation_codes
    SET
      used_count = 0,
      is_active = true,
      max_uses = 10000,
      expires_at = '2020-01-01 00:00:00+00'
    WHERE code = 'EXPIRED2024';
    RAISE NOTICE 'EXPIRED2024邀请码已更新';
  END IF;
END $$;

-- 2. 创建已存在的测试用户（用于REG-09测试）
-- 首先检查是否需要创建auth用户（这需要通过supabase auth）
-- 我们只创建public.users记录
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE phone_number = '13800000000') THEN
    -- 注意：这个INSERT可能需要有效的user_id
    -- 如果失败，需要先通过Supabase Auth创建用户
    INSERT INTO users (id, phone_number, email, full_name, created_at)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      '13800000000',
      '13800000000@phone.xiaoyu.com',
      '测试用户',
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE '测试用户13800000000已创建';
  ELSE
    RAISE NOTICE '测试用户13800000000已存在';
  END IF;
END $$;

-- 3. 验证所有测试邀请码状态
SELECT
  code,
  is_active,
  max_uses,
  used_count,
  expires_at,
  CASE
    WHEN used_count >= max_uses THEN '❌ 达到上限'
    WHEN NOT is_active THEN '❌ 未激活'
    WHEN expires_at AND expires_at < NOW() THEN '⏰ 已过期'
    ELSE '✅ 可用'
  END as status
FROM invitation_codes
WHERE code IN ('TEST1234', 'DEMO2024', 'EXPIRED2024')
ORDER BY code;

-- 4. 验证测试用户
SELECT
  phone_number,
  email,
  full_name,
  CASE
    WHEN phone_number = '13800000000' THEN '✅ 测试用户存在'
    ELSE '❌ 测试用户不存在'
  END as status
FROM users
WHERE phone_number = '13800000000';
