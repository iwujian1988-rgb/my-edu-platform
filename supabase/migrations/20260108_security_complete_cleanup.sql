-- ================================
-- 安全防护功能 - 完全清理并重建
-- ================================

-- 1. 删除所有旧策略
DROP POLICY IF EXISTS "Allow insert on registration_attempts" ON registration_attempts;
DROP POLICY IF EXISTS "Allow select on registration_attempts" ON registration_attempts;
DROP POLICY IF EXISTS "Allow service role full access to registration_attempts" ON registration_attempts;
DROP POLICY IF EXISTS "Allow insert on invitation_code_attempts" ON invitation_code_attempts;
DROP POLICY IF EXISTS "Allow select on invitation_code_attempts" ON invitation_code_attempts;
DROP POLICY IF EXISTS "Allow service role full access to invitation_code_attempts" ON invitation_code_attempts;
DROP POLICY IF EXISTS "Allow service role access to registration_attempts" ON registration_attempts;
DROP POLICY IF EXISTS "Allow service role access to invitation_code_attempts" ON invitation_code_attempts;

-- 2. 删除所有旧函数
DROP FUNCTION IF EXISTS check_and_increment_invitation_code_attempts(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS check_invitation_code_status(TEXT);
DROP FUNCTION IF EXISTS check_invitation_code_locked(TEXT);
DROP FUNCTION IF EXISTS increment_invitation_code_attempts(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS check_and_record_registration_attempt(TEXT, TEXT);
DROP FUNCTION IF EXISTS cleanup_old_registration_attempts();

-- 3. 清空旧数据
TRUNCATE TABLE invitation_code_attempts CASCADE;
TRUNCATE TABLE registration_attempts CASCADE;

-- 4. 删除所有旧索引
DROP INDEX IF EXISTS registration_attempts_ip_idx;
DROP INDEX IF EXISTS registration_attempts_locked_idx;
DROP INDEX IF EXISTS registration_attempts_ip_unique_idx;
DROP INDEX IF EXISTS invitation_code_attempts_code_idx;
DROP INDEX IF EXISTS invitation_code_attempts_locked_idx;
DROP INDEX IF EXISTS invitation_code_attempts_unique_idx;
DROP INDEX IF EXISTS invitation_code_attempts_code_unique_idx;

-- 5. 创建新的唯一索引（每个IP/邀请码只能有一条记录）
CREATE UNIQUE INDEX registration_attempts_ip_unique_idx ON registration_attempts(ip_address);
CREATE UNIQUE INDEX invitation_code_attempts_code_unique_idx ON invitation_code_attempts(code);

-- 6. 创建 IP/设备限流的原子函数
CREATE OR REPLACE FUNCTION check_and_record_registration_attempt(
  p_ip_address TEXT,
  p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
  v_record RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_one_hour_ago TIMESTAMPTZ := v_now - INTERVAL '1 hour';
  v_ip_attempts INTEGER;
  v_locked_until TIMESTAMPTZ;
BEGIN
  -- 尝试插入新记录（第一次尝试）
  BEGIN
    INSERT INTO registration_attempts (ip_address, user_agent, attempt_count, last_attempt_at)
    VALUES (p_ip_address, p_user_agent, 1, v_now);

    RETURN json_build_object(
      'success', true,
      'allowed', true,
      'ip_attempts', 1
    );
  EXCEPTION WHEN unique_violation THEN
    -- 违反唯一约束，说明 IP 已存在
  END;

  -- 获取现有记录（FOR UPDATE 锁定）
  SELECT * INTO v_record
  FROM registration_attempts
  WHERE ip_address = p_ip_address
  FOR UPDATE;

  -- 如果记录不存在（理论上不会发生）
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Record not found');
  END IF;

  -- 检查是否在锁定期
  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > v_now THEN
    RETURN json_build_object(
      'success', true,
      'allowed', false,
      'reason', 'LOCKED',
      'retry_after', v_record.locked_until
    );
  END IF;

  -- 计算该 IP 在1小时内的尝试次数
  -- 如果最后一次尝试在1小时内，计数有效；否则重置为0
  IF v_record.last_attempt_at >= v_one_hour_ago THEN
    v_ip_attempts := v_record.attempt_count;
  ELSE
    v_ip_attempts := 0;
  END IF;

  -- 检查 IP 限流（1小时内限3次）
  IF v_ip_attempts >= 3 THEN
    v_locked_until := v_now + INTERVAL '24 hours';

    UPDATE registration_attempts
    SET locked_until = v_locked_until
    WHERE ip_address = p_ip_address;

    RETURN json_build_object(
      'success', true,
      'allowed', false,
      'reason', 'IP_RATE_LIMIT',
      'retry_after', v_locked_until
    );
  END IF;

  -- 更新记录（递增计数）
  UPDATE registration_attempts
  SET
    attempt_count = v_record.attempt_count + 1,
    last_attempt_at = v_now,
    user_agent = p_user_agent
  WHERE ip_address = p_ip_address;

  RETURN json_build_object(
    'success', true,
    'allowed', true,
    'ip_attempts', v_ip_attempts + 1
  );
END;
$$ LANGUAGE plpgsql;

-- 7. 创建邀请码防爆破的原子函数
CREATE OR REPLACE FUNCTION check_and_increment_invitation_code_attempts(
  p_code TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
  v_record RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_locked_until TIMESTAMPTZ;
  v_new_count INTEGER;
BEGIN
  -- 尝试插入新记录（第一次失败）
  BEGIN
    INSERT INTO invitation_code_attempts (code, ip_address, user_agent, attempt_count, last_attempt_at)
    VALUES (p_code, p_ip_address, p_user_agent, 1, v_now);

    RETURN json_build_object(
      'success', true,
      'allowed', true,
      'attempt_count', 1,
      'locked', false
    );
  EXCEPTION WHEN unique_violation THEN
  END;

  -- 获取现有记录（FOR UPDATE 锁定）
  SELECT * INTO v_record
  FROM invitation_code_attempts
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Record not found');
  END IF;

  -- 检查是否在锁定期
  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > v_now THEN
    RETURN json_build_object(
      'success', true,
      'allowed', false,
      'reason', 'LOCKED',
      'attempt_count', v_record.attempt_count,
      'locked_until', v_record.locked_until
    );
  END IF;

  -- 计算新的失败次数
  v_new_count := v_record.attempt_count + 1;

  -- 如果达到5次，设置锁定
  IF v_new_count >= 5 THEN
    v_locked_until := v_now + INTERVAL '24 hours';
  ELSE
    v_locked_until := v_record.locked_until;
  END IF;

  -- 更新记录
  UPDATE invitation_code_attempts
  SET
    attempt_count = v_new_count,
    last_attempt_at = v_now,
    ip_address = p_ip_address,
    user_agent = p_user_agent,
    locked_until = v_locked_until
  WHERE code = p_code;

  -- 返回结果
  IF v_new_count >= 5 THEN
    RETURN json_build_object(
      'success', true,
      'allowed', false,
      'reason', 'TOO_MANY_ATTEMPTS',
      'attempt_count', v_new_count,
      'locked', true,
      'locked_until', v_locked_until
    );
  ELSE
    RETURN json_build_object(
      'success', true,
      'allowed', true,
      'attempt_count', v_new_count,
      'locked', false
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建仅查询函数
CREATE OR REPLACE FUNCTION check_invitation_code_status(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_record RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_record
  FROM invitation_code_attempts
  WHERE code = p_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('allowed', true, 'attempt_count', 0, 'locked', false);
  END IF;

  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > v_now THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'LOCKED',
      'attempt_count', v_record.attempt_count,
      'locked', true,
      'locked_until', v_record.locked_until
    );
  END IF;

  IF v_record.attempt_count >= 5 THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'TOO_MANY_ATTEMPTS',
      'attempt_count', v_record.attempt_count,
      'locked', true
    );
  END IF;

  RETURN json_build_object('allowed', true, 'attempt_count', v_record.attempt_count, 'locked', false);
END;
$$ LANGUAGE plpgsql;

-- 9. 创建 RLS 策略
ALTER TABLE registration_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_code_attempts ENABLE ROW LEVEL SECURITY;

-- 允许匿名和认证用户插入（用于记录安全事件）
CREATE POLICY "Allow insert on registration_attempts" ON registration_attempts
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow insert on invitation_code_attempts" ON invitation_code_attempts
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 允许匿名和认证用户查询（用于检查限制）
CREATE POLICY "Allow select on registration_attempts" ON registration_attempts
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow select on invitation_code_attempts" ON invitation_code_attempts
  FOR SELECT TO anon, authenticated USING (true);

-- 允许 service_role 完全访问
CREATE POLICY "Allow service role all access on registration_attempts" ON registration_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all access on invitation_code_attempts" ON invitation_code_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 10. 添加注释
COMMENT ON FUNCTION check_and_record_registration_attempt IS '检查并记录注册尝试（IP限流：1小时3次）';
COMMENT ON FUNCTION check_and_increment_invitation_code_attempts IS '检查并递增邀请码失败次数（5次锁定24小时）';
COMMENT ON FUNCTION check_invitation_code_status IS '查询邀请码状态（不修改数据）';
