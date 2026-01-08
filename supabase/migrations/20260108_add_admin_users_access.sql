-- 添加管理员访问 users 表的 RLS 策略
-- 问题：管理员无法在管理后台查看用户列表

-- 1. 首先启用 RLS（如果尚未启用）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Administrators can view all users" ON users;

-- 3. 创建用户自己的访问策略
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. 创建管理员访问策略
-- 允许管理员查看所有用户
CREATE POLICY "Administrators can view all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.user_id = auth.uid()
        AND administrators.is_active = true
    )
  );

-- 5. 验证策略是否创建成功
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
