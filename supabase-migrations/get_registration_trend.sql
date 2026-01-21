-- 获取注册走势数据（最近N天每日新增用户）
-- 完全重写，避免所有歧义问题

DROP FUNCTION IF EXISTS get_registration_trend(integer);

CREATE OR REPLACE FUNCTION get_registration_trend(days_count INTEGER DEFAULT 30)
RETURNS TABLE(
  trend_date DATE,
  trend_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_date_var DATE := CURRENT_DATE - (days_count - 1);
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS temp_results (
    result_date DATE,
    result_count BIGINT
  );

  TRUNCATE temp_results;

  WHILE current_date_var <= CURRENT_DATE LOOP
    INSERT INTO temp_results (result_date, result_count)
    SELECT current_date_var, COUNT(*)::BIGINT
    FROM users
    WHERE created_at >= current_date_var
      AND created_at < current_date_var + INTERVAL '1 day';

    current_date_var := current_date_var + 1;
  END LOOP;

  RETURN QUERY
  SELECT result_date, result_count
  FROM temp_results
  ORDER BY result_date;

  DROP TABLE temp_results;
END;
$$;

COMMENT ON FUNCTION get_registration_trend IS '获取最近N天的注册走势数据';
