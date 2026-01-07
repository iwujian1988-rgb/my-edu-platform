/**
 * 临时脚本：创建smart_import_quota表
 *
 * 使用方法：
 * 1. 在浏览器控制台执行（需要先登录）
 * 2. 或者通过API调用
 */

const CREATE_TABLE_SQL = `
-- 智能录入配额表
CREATE TABLE IF NOT EXISTS smart_import_quota (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS smart_import_quota_user_date_idx
ON smart_import_quota(user_id, date_trunc('day', created_at));

-- 创建索引
CREATE INDEX IF NOT EXISTS smart_import_quota_user_id_idx
ON smart_import_quota(user_id);

-- 启用RLS
ALTER TABLE smart_import_quota ENABLE ROW LEVEL SECURITY;

-- RLS策略
CREATE POLICY IF NOT EXISTS "Users can view own quota"
ON smart_import_quota
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own quota"
ON smart_import_quota
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own quota"
ON smart_import_quota
FOR UPDATE
USING (auth.uid() = user_id);
`;

// 浏览器控制台执行方法：
console.log('请在Supabase控制台的SQL Editor中执行以上SQL语句');
console.log('URL: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new')
