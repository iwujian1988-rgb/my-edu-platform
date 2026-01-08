-- 安全防护功能表 (安全版本 - 可重复执行)
-- 创建时间: 2026-01-08
-- 功能: IP/设备限流 + 邀请码防爆破

-- 1. 注册尝试记录表 (IP/设备限流)
CREATE TABLE IF NOT EXISTS registration_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  attempt_count INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引优化
CREATE INDEX IF NOT EXISTS registration_attempts_ip_idx ON registration_attempts(ip_address);
CREATE INDEX IF NOT EXISTS registration_attempts_locked_idx ON registration_attempts(locked_until) WHERE locked_until IS NOT NULL;

-- 2. 邀请码验证失败记录表 (防爆破)
CREATE TABLE IF NOT EXISTS invitation_code_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  attempt_count INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引优化
CREATE INDEX IF NOT EXISTS invitation_code_attempts_code_idx ON invitation_code_attempts(code);
CREATE INDEX IF NOT EXISTS invitation_code_attempts_locked_idx ON invitation_code_attempts(locked_until) WHERE locked_until IS NOT NULL;

-- RLS 策略 (先删除已存在的策略，再创建)
DROP POLICY IF EXISTS "Allow service role access to registration_attempts" ON registration_attempts;
DROP POLICY IF EXISTS "Allow service role access to invitation_code_attempts" ON invitation_code_attempts;

ALTER TABLE registration_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_code_attempts ENABLE ROW LEVEL SECURITY;

-- 允许服务端访问
CREATE POLICY "Allow service role access to registration_attempts" ON registration_attempts
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role access to invitation_code_attempts" ON invitation_code_attempts
  FOR ALL TO service_role USING (true);

-- 定期清理旧数据的函数 (可选，后续通过cron调用)
CREATE OR REPLACE FUNCTION cleanup_old_registration_attempts()
RETURNS void AS $$
BEGIN
  -- 删除7天前的记录
  DELETE FROM registration_attempts
  WHERE created_at < NOW() - INTERVAL '7 days';

  DELETE FROM invitation_code_attempts
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
