-- 重置测试邀请码状态
-- 在数据库管理工具（如pgAdmin、DBeaver）中执行此脚本

-- 1. 查看当前邀请码状态
SELECT
  code,
  is_active,
  max_uses,
  used_count,
  expires_at,
  CASE
    WHEN expires_at IS NULL THEN '永不过期'
    WHEN new Date(expires_at) < new Date() THEN '已过期'
    ELSE '有效'
  END as validity_status,
  CASE
    WHEN used_count >= max_uses THEN '已达上限'
    ELSE '可用'
  END as usage_status
FROM invitation_codes
WHERE code IN ('TEST1234', 'DEMO2024', 'EXPIRED2024')
ORDER BY code;

-- 2. 重置测试邀请码（如果需要）
-- 取消下面的注释来执行重置

-- 重置TEST1234（有效邀请码）
UPDATE invitation_codes
SET
  used_count = 0,
  is_active = true,
  max_uses = 10000,
  expires_at = '2026-12-31 23:59:59'
WHERE code = 'TEST1234';

-- 重置DEMO2024（有效邀请码）
UPDATE invitation_codes
SET
  used_count = 0,
  is_active = true,
  max_uses = 10000,
  expires_at = '2026-12-31 23:59:59'
WHERE code = 'DEMO2024';

-- 重置EXPIRED2024（过期邀请码 - 用于测试过期场景）
UPDATE invitation_codes
SET
  used_count = 0,
  is_active = true,
  max_uses = 10000,
  expires_at = '2020-01-01 00:00:00'  -- 设置为过去的时间
WHERE code = 'EXPIRED2024';

-- 如果邀请码不存在，插入它们
INSERT INTO invitation_codes (code, is_active, max_uses, used_count, expires_at, created_at)
VALUES
  ('TEST1234', true, 10000, 0, '2026-12-31 23:59:59', NOW()),
  ('DEMO2024', true, 10000, 0, '2026-12-31 23:59:59', NOW()),
  ('EXPIRED2024', true, 10000, 0, '2020-01-01 00:00:00', NOW())
ON CONFLICT (code) DO NOTHING;

-- 3. 验证重置结果
SELECT
  code,
  is_active,
  max_uses,
  used_count,
  expires_at,
  CASE
    WHEN used_count >= max_uses THEN '❌ 达到上限'
    WHEN NOT is_active THEN '❌ 未激活'
    WHEN expires_at AND new Date(expires_at) < new Date() THEN '⏰ 已过期'
    ELSE '✅ 可用'
  END as status
FROM invitation_codes
WHERE code IN ('TEST1234', 'DEMO2024', 'EXPIRED2024')
ORDER BY code;
