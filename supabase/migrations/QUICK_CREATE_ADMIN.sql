-- ============================================
-- 快速创建测试管理员账户
-- ============================================
--
-- 📌 使用前必读：
-- 1. 先在 Supabase Dashboard > Authentication > Users 中创建用户
--    邮箱：admin@xiaoyu.com
--    密码：Admin123!
--    勾选 "Auto Confirm User"
--
-- 2. 然后执行此 SQL 脚本
--
-- ============================================

-- 第一步：查找刚创建的用户并创建管理员记录
DO $$
DECLARE
  v_user_id UUID;
  v_admin_email TEXT := 'admin@xiaoyu.com';  -- 👉 修改为你的邮箱
BEGIN
  -- 查找用户ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_admin_email;

  -- 检查用户是否存在
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ 用户不存在！请先在 Authentication > Users 中创建用户';
  END IF;

  -- 创建管理员记录
  INSERT INTO administrators (
    user_id,
    role,
    name,
    email,
    is_active
  ) VALUES (
    v_user_id,
    'super_admin',           -- 超级管理员
    '测试管理员',             -- 显示名称
    v_admin_email,            -- 邮箱
    true                      -- 激活状态
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active;

  RAISE NOTICE '✅ 管理员账户创建成功！';
  RAISE NOTICE '📧 邮箱: %', v_admin_email;
  RAISE NOTICE '🔑 密码: Admin123!';
  RAISE NOTICE '👤 角色: 超级管理员';
  RAISE NOTICE '🌐 登录地址: http://localhost:3000/admin/login';
END $$;

-- 第二步：查询创建的管理员
SELECT
  '✅ 管理员信息' as info,
  a.id as admin_id,
  a.role,
  a.name,
  a.email,
  a.is_active,
  u.email as auth_email,
  u.created_at,
  u.last_sign_in_at
FROM administrators a
JOIN auth.users u ON a.user_id = u.id
WHERE a.email = 'admin@xiaoyu.com'  -- 👉 修改为你的邮箱
ORDER BY a.created_at DESC;

-- 第三步：验证权限
SELECT
  '✅ 权限检查' as info,
  COUNT(DISTINCT CASE WHEN a.role = 'super_admin' THEN 1 END) as super_admins,
  COUNT(DISTINCT CASE WHEN a.role = 'content_admin' THEN 1 END) as content_admins,
  COUNT(DISTINCT CASE WHEN a.role = 'support' THEN 1 END) as supports
FROM administrators a
WHERE a.is_active = true;

-- ============================================
-- 📝 测试登录信息
-- ============================================
--
-- 登录地址：http://localhost:3000/admin/login
-- 邮箱：admin@xiaoyu.com
-- 密码：Admin123!
--
-- 登录成功后，您将看到：
--   ✅ 仪表盘（4个核心指标卡片）
--   ✅ 侧边栏导航
--   ✅ 最近操作日志
--   ✅ 待办事项（如有）
--
-- ============================================
