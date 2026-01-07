-- 智能录入配额表
-- 记录用户每日智能录入单词数量

CREATE TABLE IF NOT EXISTS smart_import_quota (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0, -- 当日已使用次数
  quota_date DATE NOT NULL DEFAULT CURRENT_DATE, -- 记录日期（只存储日期部分）
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建唯一索引：每个用户每天只有一条记录
CREATE UNIQUE INDEX IF NOT EXISTS smart_import_quota_user_date_idx
ON smart_import_quota(user_id, quota_date);

-- 创建索引：加速查询
CREATE INDEX IF NOT EXISTS smart_import_quota_user_id_idx
ON smart_import_quota(user_id);

CREATE INDEX IF NOT EXISTS smart_import_quota_quota_date_idx
ON smart_import_quota(quota_date);

-- 启用RLS
ALTER TABLE smart_import_quota ENABLE ROW LEVEL SECURITY;

-- RLS策略：用户只能查看和修改自己的配额记录
DROP POLICY IF EXISTS "Users can view own quota" ON smart_import_quota;
DROP POLICY IF EXISTS "Users can insert own quota" ON smart_import_quota;
DROP POLICY IF EXISTS "Users can update own quota" ON smart_import_quota;

CREATE POLICY "Users can view own quota"
ON smart_import_quota
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quota"
ON smart_import_quota
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quota"
ON smart_import_quota
FOR UPDATE
USING (auth.uid() = user_id);

-- 添加注释
COMMENT ON TABLE smart_import_quota IS '智能录入配额表：记录用户每日智能识别单词的数量';
COMMENT ON COLUMN smart_import_quota.user_id IS '用户ID';
COMMENT ON COLUMN smart_import_quota.count IS '当日已使用的配额数量';
COMMENT ON COLUMN smart_import_quota.quota_date IS '配额日期（日期部分）';
COMMENT ON COLUMN smart_import_quota.created_at IS '记录创建时间';
COMMENT ON COLUMN smart_import_quota.updated_at IS '最后更新时间';
