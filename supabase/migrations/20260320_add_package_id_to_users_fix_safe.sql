-- ============================================
-- 修复视频权限系统 - 安全版本
-- 版本: v1.1-safe
-- 日期: 2026-03-20
-- 说明: 分步执行，降低风险，可回滚
-- ============================================

-- ============================================
-- Step 1: 检查当前状态
-- ============================================

-- 查看有多少用户需要迁移
SELECT
  COUNT(*) FILTER (WHERE invitation_code_id IS NOT NULL AND package_id IS NULL) as need_migration,
  COUNT(*) FILTER (WHERE package_id IS NOT NULL) as already_migrated,
  COUNT(*) as total_users
FROM users;

-- ============================================
-- Step 2: 添加列（无外键约束，降低风险）
-- ============================================

-- 先添加列，不添加外键约束（更安全）
ALTER TABLE users
ADD COLUMN IF NOT EXISTS package_id UUID;

COMMENT ON COLUMN users.package_id IS '用户当前关联的套餐ID';

-- ============================================
-- Step 3: 数据迁移（小批量，避免锁表）
-- ============================================

-- 方案 A: 直接迁移（适合小数据量 < 10000）
UPDATE users u
SET package_id = ic.package_id
FROM invitation_codes ic
WHERE ic.used_by = u.id
  AND ic.package_id IS NOT NULL
  AND u.package_id IS NULL;

-- 方案 B: 分批迁移（适合大数据量，取消上面的方案 A，使用下面这个）
-- 每次更新 1000 条，减少锁表时间
-- DO $$
-- DECLARE
--   batch_size INTEGER := 1000;
--   updated_count INTEGER;
-- BEGIN
--   LOOP
--     WITH updated_rows AS (
--       UPDATE users u
--       SET package_id = ic.package_id
--       FROM invitation_codes ic
--       WHERE ic.used_by = u.id
--         AND ic.package_id IS NOT NULL
--         AND u.package_id IS NULL
--       LIMIT batch_size
--       RETURNING u.id
--     )
--     SELECT COUNT(*) INTO updated_count FROM updated_rows;
--     EXIT WHEN updated_count = 0;
--     COMMIT;
--   END LOOP;
-- END $$;

-- ============================================
-- Step 4: 添加外键约束（可选，数据验证后执行）
-- ============================================

-- 验证数据一致性后再执行（取消注释执行）
-- ALTER TABLE users
-- ADD CONSTRAINT fk_users_package_id
-- FOREIGN KEY (package_id) REFERENCES invitation_packages(id)
-- ON DELETE SET NULL;

-- ============================================
-- Step 5: 创建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_package_id ON users(package_id);

-- ============================================
-- Step 6: 验证结果
-- ============================================

SELECT
  COUNT(*) FILTER (WHERE package_id IS NOT NULL) as migrated_count,
  COUNT(*) FILTER (WHERE package_id IS NULL AND invitation_code_id IS NOT NULL) as failed_count
FROM users;

-- ============================================
-- 回滚方案（如果需要）
-- ============================================
-- 取消下面的注释来回滚
-- ALTER TABLE users DROP COLUMN IF EXISTS package_id;

-- ============================================
-- 完成
-- ============================================
