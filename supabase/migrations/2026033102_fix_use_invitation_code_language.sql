-- 修复 use_invitation_code 函数：注册时复制 language_packages 到用户
-- ⚠️ 只在原函数 UPDATE users 中增加一行 language_packages
-- 不改动其他任何逻辑
-- ============================================================
-- 风险分析：
--   1. invitation_codes 表没有 language_packages 列，只 → 不能引用 invitation_code.language_packages
--   2. 只引用 package_record.language_packages（invitation_packages 表有这个字段）
--   3. 默认值 ARRAY['en']（英语）
-- ============================================================

CREATE OR REPLACE FUNCTION use_invitation_code(code_param TEXT, user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_code RECORD;
  package_record RECORD;
  validity_interval INTERVAL;
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

  -- 计算有效期
  validity_interval := CASE
    WHEN package_record.id IS NOT NULL AND package_record.validity_days IS NOT NULL
    THEN (package_record.validity_days || ' days')::INTERVAL
    WHEN package_record.id IS NOT NULL AND package_record.validity_days IS NULL
    THEN NULL
    WHEN invitation_code.validity_days IS NOT NULL
    THEN (invitation_code.validity_days || ' days')::INTERVAL
    ELSE NULL
  END;

  -- 更新用户权限（在原有基础上只增加 language_packages 一行）
  UPDATE users
  SET
    package_id = COALESCE(package_record.id, invitation_code.package_id),
    feature_permissions = COALESCE(package_record.feature_permissions, invitation_code.feature_permissions, ARRAY[]::TEXT[]),
    book_permissions = COALESCE(package_record.book_permissions, invitation_code.book_permissions, ARRAY[]::TEXT[]),
    language_packages = COALESCE(package_record.language_packages, ARRAY['en']::TEXT[]),
    invitation_code_id = invitation_code.id,
    permission_expires_at = CASE
      WHEN validity_interval IS NOT NULL
      THEN NOW() + validity_interval
      ELSE NULL
    END
  WHERE id = user_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION use_invitation_code IS '使用邀请码注册（复制 feature_permissions、book_permissions、language_packages 到用户）';

-- ============================================
-- 数据修复：所有现有用户都是英语会员，-- 代码层面 normalizeLanguagePackages(null) 已默认 ['en']，
-- 但显式写入数据库可以避免歧义
-- ============================================

UPDATE users
SET language_packages = ARRAY['en']::TEXT[]
WHERE language_packages IS NULL
   OR array_length(language_packages, 1) IS NULL;
