-- ============================================
-- 修复邀请码表 RLS 策略 - 在 Supabase 控制台执行
-- ============================================

-- 1. 删除现有的所有策略（如果有）
DROP POLICY IF EXISTS "Users can view invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Users can insert invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Users can update invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Users can delete invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Administrators can manage invitation codes" ON invitation_codes;

-- 2. 为管理员创建完整的CRUD策略
CREATE POLICY "Administrators can view invitation codes"
ON invitation_codes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM administrators
    WHERE administrators.id = auth.uid()
  )
);

CREATE POLICY "Administrators can insert invitation codes"
ON invitation_codes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM administrators
    WHERE administrators.id = auth.uid()
  )
);

CREATE POLICY "Administrators can update invitation codes"
ON invitation_codes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM administrators
    WHERE administrators.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM administrators
    WHERE administrators.id = auth.uid()
  )
);

CREATE POLICY "Administrators can delete invitation codes"
ON invitation_codes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM administrators
    WHERE administrators.id = auth.uid()
  )
);
