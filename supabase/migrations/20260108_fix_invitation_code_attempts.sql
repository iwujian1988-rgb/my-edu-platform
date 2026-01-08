-- 修复邀请码尝试表的并发问题
-- 添加唯一约束，使用数据库函数原子更新

-- 1. 删除旧数据
TRUNCATE TABLE invitation_code_attempts CASCADE;

-- 2. 添加唯一约束（一个邀请码只能有一条记录）
ALTER TABLE invitation_code_attempts
ADD COLUMN unique_code TEXT GENERATED ALWAYS AS (code) STORED;
CREATE UNIQUE INDEX invitation_code_attempts_unique_idx ON invitation_code_attempts(unique_code);

-- 3. 创建原子更新函数
CREATE OR REPLACE FUNCTION increment_invitation_code_attempts(
  p_code TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
  v_record RECORD;
  v_locked_until TIMESTAMPTZ;
  v_new_count INTEGER;
BEGIN
  -- 查找现有记录（带锁）
  SELECT * INTO v_record
  FROM invitation_code_attempts
  WHERE code = p_code
  FOR UPDATE;

  -- 如果不存在，插入新记录
  IF NOT FOUND THEN
    INSERT INTO invitation_code_attempts (code, ip_address, user_agent, attempt_count, last_attempt_at)
    VALUES (p_code, p_ip_address, p_user_agent, 1, NOW())
    RETURNING
      attempt_count,
      locked_until,
      CASE
        WHEN attempt_count >= 5 THEN true
        ELSE false
      END INTO v_new_count, v_locked_until, v_locked;

    RETURN json_build_object(
      'attempt_count', v_new_count,
      'locked', v_locked,
      'locked_until', v_locked_until
    );
  END IF;

  -- 如果存在，更新计数
  v_new_count := v_record.attempt_count + 1;

  -- 如果达到5次，设置锁定
  IF v_new_count >= 5 THEN
    v_locked_until := NOW() + INTERVAL '24 hours';
  ELSE
    v_locked_until := v_record.locked_until;
  END IF;

  -- 更新记录
  UPDATE invitation_code_attempts
  SET
    attempt_count = v_new_count,
    last_attempt_at = NOW(),
    ip_address = p_ip_address,
    user_agent = p_user_agent,
    locked_until = v_locked_until
  WHERE code = p_code
  RETURNING
    attempt_count,
    locked_until,
    CASE
      WHEN v_new_count >= 5 THEN true
      ELSE false
    END INTO v_new_count, v_locked_until, v_locked;

  RETURN json_build_object(
    'attempt_count', v_new_count,
    'locked', v_locked,
    'locked_until', v_locked_until
  );
END;
$$ LANGUAGE plpgsql;

-- 4. 创建查询函数
CREATE OR REPLACE FUNCTION check_invitation_code_locked(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_record RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_record
  FROM invitation_code_attempts
  WHERE code = p_code
  LIMIT 1;

  -- 如果没有记录，允许
  IF NOT FOUND THEN
    RETURN json_build_object('locked', false, 'attempt_count', 0);
  END IF;

  -- 检查是否在锁定期
  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > v_now THEN
    RETURN json_build_object(
      'locked', true,
      'reason', 'LOCKED',
      'attempt_count', v_record.attempt_count,
      'locked_until', v_record.locked_until
    );
  END IF;

  -- 检查失败次数
  IF v_record.attempt_count >= 5 THEN
    -- 锁定
    UPDATE invitation_code_attempts
    SET locked_until = v_now + INTERVAL '24 hours'
    WHERE code = p_code;

    RETURN json_build_object(
      'locked', true,
      'reason', 'TOO_MANY_ATTEMPTS',
      'attempt_count', v_record.attempt_count,
      'locked_until', v_now + INTERVAL '24 hours'
    );
  END IF;

  -- 允许
  RETURN json_build_object(
    'locked', false,
    'attempt_count', v_record.attempt_count
  );
END;
$$ LANGUAGE plpgsql;
