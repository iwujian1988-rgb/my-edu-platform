-- ============================================
-- 解锁IP限流 - SQL脚本
-- 运行方式: 在数据库管理工具中执行
-- ============================================

-- 方案1: 查看限流记录
SELECT * FROM registration_attempts
ORDER BY created_at DESC
LIMIT 10;

-- 方案2: 查看邀请码尝试记录
SELECT * FROM invitation_code_attempts
ORDER BY created_at DESC
LIMIT 10;

-- 方案3: 清空注册限流记录
DELETE FROM registration_attempts;

-- 方案4: 清空邀请码尝试记录
DELETE FROM invitation_code_attempts;

-- 方案5: 重置所有相关表
TRUNCATE TABLE registration_attempts RESTART IDENTITY CASCADE;
TRUNCATE TABLE invitation_code_attempts RESTART IDENTITY CASCADE;

-- 验证清空结果
SELECT
  (SELECT COUNT(*) FROM registration_attempts) as registration_count,
  (SELECT COUNT(*) FROM invitation_code_attempts) as invitation_code_count;

-- ============================================
-- 如果上面的表不存在，尝试直接调用RPC函数
-- ============================================

-- 查看函数列表
SELECT proname
FROM pg_proc
WHERE proname LIKE '%registration%'
   OR proname LIKE '%invitation%'
   OR proname LIKE '%rate_limit%';

-- ============================================
-- 如果还是不行，直接删除并重建测试数据
-- ============================================

-- 查看所有表
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE '%attempt%'
       OR tablename LIKE '%rate%');
