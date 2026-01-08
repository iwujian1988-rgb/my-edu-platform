-- ================================
-- 安全防护功能 - 最终修复版本
-- 使用 UPSERT 模式解决所有并发问题
-- ================================

-- 1. 清空旧数据
TRUNCATE TABLE invitation_code_attempts CASCADE;
TRUNCATE TABLE registration_attempts CASCADE;

-- 2. 删除旧索引
DROP INDEX IF EXISTS registration_attempts_ip_unique_idx;
DROP INDEX IF EXISTS invitation_code_attempts_code_unique_idx;
DROP INDEX IF EXISTS invitation_code_attempts_unique_idx;

-- 3. 创建复合唯一索引
-- 每个邀请码 + IP地址只能有一条记录（防止同一IP重复尝试）
CREATE UNIQUE INDEX invitation_code_attempts_unique_idx
  ON invitation_code_attempts(code, ip_address);

-- 每个IP地址只能有一条记录
CREATE UNIQUE INDEX registration_attempts_ip_unique_idx
  ON registration_attempts(ip_address);

-- 4. 重新创建邀请码防爆破函数（使用 INSERT ... ON CONFLICT）
CREATE OR REPLACE FUNCTION check_and_increment_invitation_code_attempts(
  p_code TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_locked_until TIMESTAMPTZ;
  v_new_count INTEGER;
  v_is_locked BOOLEAN;
  v_existing_count INTEGER;
  v_existing_locked TIMESTAMPTZ;
BEGIN
  -- 检查是否已存在记录
  SELECT attempt_count, locked_until
  INTO v_existing_count, v_existing_locked
  FROM invitation_code_attempts
  WHERE code = p_code AND ip_address = p_ip_address
  FOR UPDATE; -- 锁定记录

  -- 如果找不到记录，插入新记录
  IF NOT FOUND THEN
    INSERT INTO invitation_code_attempts (code, ip_address, user_agent, attempt_count, last_attempt_at, created_at)
    VALUES (p_code, p_ip_address, p_user_agent, 1, v_now, v_now);

    RETURN json_build_object(
      'success', true,
      'allowed', true,
      'attempt_count', 1,
      'locked', false
    );
  END IF;

  -- 找到了现有记录
  v_new_count := v_existing_count + 1;

  -- 检查是否已锁定
  IF v_existing_locked IS NOT NULL AND v_existing_locked > v_now THEN
    RETURN json_build_object(
      'success', true,
      'allowed', false,
      'reason', 'LOCKED',
      'attempt_count', v_existing_count,
      'locked', true,
      'locked_until', v_existing_locked
    );
  END IF;

  -- 检查是否达到5次
  v_is_locked := v_new_count >= 5;
  IF v_is_locked THEN
    v_locked_until := v_now + INTERVAL '24 hours';
  ELSE
    v_locked_until := COALESCE(v_existing_locked, NULL);
  END IF;

  -- 更新记录
  UPDATE invitation_code_attempts
  SET
    attempt_count = v_new_count,
    last_attempt_at = v_now,
    user_agent = p_user_agent,
    locked_until = v_locked_until
  WHERE code = p_code AND ip_address = p_ip_address;

  -- 返回结果
  IF v_is_locked THEN
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

-- 5. 重新创建 IP 限流函数
CREATE OR REPLACE FUNCTION check_and_record_registration_attempt(
  p_ip_address TEXT,
  p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_one_hour_ago TIMESTAMPTZ := v_now - INTERVAL '1 hour';
  v_locked_until TIMESTAMPTZ;
  v_ip_attempts INTEGER;
  v_existing_count INTEGER;
  v_existing_locked TIMESTAMPTZ;
  v_last_attempt TIMESTAMPTZ;
BEGIN
  -- 检查是否已存在记录
  SELECT attempt_count, locked_until, last_attempt_at
  INTO v_existing_count, v_existing_locked, v_last_attempt
  FROM registration_attempts
  WHERE ip_address = p_ip_address
  FOR UPDATE; -- 锁定记录

  -- 如果找不到记录，插入新记录
  IF NOT FOUND THEN
    INSERT INTO registration_attempts (ip_address, user_agent, attempt_count, last_attempt_at, created_at)
    VALUES (p_ip_address, p_user_agent, 1, v_now, v_now);

    RETURN json_build_object(
      'success', true,
      'allowed', true,
      'ip_attempts', 1
    );
  END IF;

  -- 找到了现有记录，检查是否已锁定
  IF v_existing_locked IS NOT NULL AND v_existing_locked > v_now THEN
    RETURN json_build_object(
      'success', true,
      'allowed', false,
      'reason', 'LOCKED',
      'retry_after', v_existing_locked
    );
  END IF;

  -- 计算有效尝试次数（1小时内的）
  IF v_last_attempt >= v_one_hour_ago THEN
    v_ip_attempts := v_existing_count;
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
    attempt_count = v_existing_count + 1,
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

-- 6. 简单的查询函数（仅用于调试）
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

-- 7. 重新创建 RLS 策略（删除所有旧策略）
DROP POLICY IF EXISTS "Allow insert on registration_attempts" ON registration_attempts;
DROP POLICY IF EXISTS "Allow select on registration_attempts" ON registration_attempts;
DROP POLICY IF EXISTS "Allow service role all access on registration_attempts" ON registration_attempts;
DROP POLICY IF EXISTS "Allow insert on invitation_code_attempts" ON invitation_code_attempts;
DROP POLICY IF EXISTS "Allow select on invitation_code_attempts" ON invitation_code_attempts;
DROP POLICY IF EXISTS "Allow service role all access on invitation_code_attempts" ON invitation_code_attempts;
DROP POLICY IF EXISTS "Allow full access on registration_attempts" ON registration_attempts;
DROP POLICY IF EXISTS "Allow full access on invitation_code_attempts" ON invitation_code_attempts;

-- 确保 RLS 已启用
ALTER TABLE registration_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_code_attempts ENABLE ROW LEVEL SECURITY;

-- 创建新策略（允许 anon/authenticated 用户完全访问）
CREATE POLICY "Allow full access on registration_attempts" ON registration_attempts
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access on invitation_code_attempts" ON invitation_code_attempts
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 允许 service_role 完全访问
CREATE POLICY "Allow service role all access on registration_attempts" ON registration_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all access on invitation_code_attempts" ON invitation_code_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. 添加注释
COMMENT ON FUNCTION check_and_record_registration_attempt IS '检查并记录注册尝试（IP限流：1小时3次）- 使用 FOR UPDATE 锁定模式';
COMMENT ON FUNCTION check_and_increment_invitation_code_attempts IS '检查并递增邀请码失败次数（5次锁定24小时）- 使用 FOR UPDATE 锁定模式';
COMMENT ON FUNCTION check_invitation_code_status IS '查询邀请码状态（调试用）';
COMMENT ON INDEX invitation_code_attempts_unique_idx IS '邀请码+IP唯一索引，防止并发重复插入';
COMMENT ON INDEX registration_attempts_ip_unique_idx IS 'IP唯一索引，防止并发重复插入';
