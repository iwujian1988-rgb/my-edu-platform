-- 修复注册时使用套餐的权限配置
-- 问题：注册时只使用了邀请码的快照，但没有使用套餐的duration_days
-- 解决：更新use_invitation_code函数，从套餐表获取duration_days

CREATE OR REPLACE FUNCTION use_invitation_code(code_param TEXT, user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_code RECORD;
  package_record RECORD;
BEGIN
  -- 查找邀请码
  SELECT * INTO invitation_code
  FROM invitation_codes
  WHERE code = code_param
  AND is_active = true
  AND used_by IS NULL
  AND (expires_at IS NULL OR expires_at > NOW())
  FOR UPDATE;

  -- 如果邀请码不存在或已使用
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 标记邀请码为已使用
  UPDATE invitation_codes
  SET
    used_by = user_id_param,
    used_at = NOW(),
    used_count = used_count + 1
  WHERE id = invitation_code.id;

  -- 查找套餐信息（如果有关联）
  SELECT * INTO package_record
  FROM invitation_packages
  WHERE id = invitation_code.package_id;

  -- 更新用户权限
  -- 优先使用套餐的duration_days，如果没有套餐则使用邀请码的validity_days
  UPDATE users
  SET
    feature_permissions = invitation_code.feature_permissions,
    book_permissions = invitation_code.book_permissions,
    invitation_code_id = invitation_code.id,
    permission_expires_at = CASE
      -- 如果有套餐且套餐有duration_days，使用套餐的duration_days
      WHEN package_record.id IS NOT NULL AND package_record.duration_days IS NOT NULL
      THEN NOW() + (package_record.duration_days || ' days')::INTERVAL
      -- 如果有套餐但duration_days为null，设为null（永久）
      WHEN package_record.id IS NOT NULL AND package_record.duration_days IS NULL
      THEN NULL
      -- 如果没有套餐，使用邀请码的validity_days
      WHEN invitation_code.validity_days IS NOT NULL
      THEN NOW() + (invitation_code.validity_days || ' days')::INTERVAL
      -- 都没有，设为null（永久）
      ELSE NULL
    END
  WHERE id = user_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON FUNCTION use_invitation_code IS '使用邀请码注册（支持套餐系统）';
