-- 修复 RLS 策略，允许客户端插入安全记录
-- 问题：当前的 RLS 只允许 service_role 访问，但注册时使用的是 anon key
-- 解决：添加允许所有用户插入的安全策略

-- 删除旧策略
DROP POLICY IF EXISTS "Allow service role access to registration_attempts" ON registration_attempts;
DROP POLICY IF EXISTS "Allow service role access to invitation_code_attempts" ON invitation_code_attempts;

-- 新策略：允许任何人插入（用于记录安全事件）
CREATE POLICY "Allow insert on registration_attempts" ON registration_attempts
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow insert on invitation_code_attempts" ON invitation_code_attempts
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 允许 service_role 完全访问
CREATE POLICY "Allow service role full access to registration_attempts" ON registration_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to invitation_code_attempts" ON invitation_code_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 允许认证用户和匿名用户查询（用于检查限制）
CREATE POLICY "Allow select on registration_attempts" ON registration_attempts
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow select on invitation_code_attempts" ON invitation_code_attempts
  FOR SELECT TO anon, authenticated USING (true);
