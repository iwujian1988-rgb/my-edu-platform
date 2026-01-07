-- 创建测试管理员账户
-- 用于开发测试

-- 第一步：在 Supabase Auth 中创建用户（需要通过Supabase Dashboard或API）
-- 第二步：创建管理员记录

-- 注意：请先在 Supabase Dashboard > Authentication > Users 中手动创建一个用户
-- 或者使用以下API创建：

-- 在创建用户后，使用用户的 email 和 password 运行以下SQL：

DO $$
DECLARE
  v_user_id UUID;
  v_admin_id UUID;
BEGIN
  -- 1. 通过邮箱查找用户（请替换为实际邮箱）
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@example.com';  -- 替换为实际邮箱

  -- 如果用户不存在，提示
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '用户不存在，请先在 Supabase Auth 中创建用户';
  END IF;

  -- 2. 创建管理员记录（如果不存在）
  INSERT INTO administrators (
    user_id,
    role,
    name,
    email,
    is_active
  ) VALUES (
    v_user_id,
    'super_admin',
    '超级管理员',
    'admin@example.com',  -- 替换为实际邮箱
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active;

  RAISE NOTICE '管理员账户创建成功！';
  RAISE NOTICE '邮箱: admin@example.com';
  RAISE NOTICE '角色: super_admin';
END $$;

-- 查询创建的管理员
SELECT
  a.id,
  a.role,
  a.name,
  a.email,
  a.is_active,
  u.email as auth_email,
  u.created_at
FROM administrators a
JOIN auth.users u ON a.user_id = u.id
ORDER BY a.created_at DESC
LIMIT 5;
