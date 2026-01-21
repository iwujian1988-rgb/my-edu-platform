-- 获取注册走势数据（最近N天每日新增用户）
-- 修复：避免列名歧义

CREATE OR REPLACE FUNCTION get_registration_trend(days_count INTEGER DEFAULT 30)
RETURNS TABLE(
  reg_date DATE,
  user_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date DATE := CURRENT_DATE - (days_count - 1);
  loop_date DATE := start_date;
BEGIN
  -- 临时表存储结果（使用明确的列名）
  CREATE TEMP TABLE IF NOT EXISTS temp_registration_trend (
    reg_date DATE,
    user_count BIGINT
  );

  -- 清空临时表
  TRUNCATE temp_registration_trend;

  -- 循环生成每天的统计数据
  WHILE loop_date <= CURRENT_DATE LOOP
    INSERT INTO temp_registration_trend (reg_date, user_count)
    SELECT
      loop_date,
      COUNT(*)::BIGINT
    FROM users
    WHERE created_at >= loop_date
      AND created_at < loop_date + INTERVAL '1 day';

    loop_date := loop_date + INTERVAL '1 day';
  END LOOP;

  -- 返回结果
  RETURN QUERY
  SELECT reg_date, user_count
  FROM temp_registration_trend
  ORDER BY reg_date;

  -- 清理临时表
  DROP TABLE IF EXISTS temp_registration_trend;
END;
$$;

COMMENT ON FUNCTION get_registration_trend IS '获取最近N天的注册走势数据（日期和每日新增用户数）';
