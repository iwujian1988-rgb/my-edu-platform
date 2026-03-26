-- 创建 UP主（创作者）表
-- 用于管理视频来源的创作者信息

CREATE TABLE IF NOT EXISTS upstream_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,   -- 昵称，用于批量上传匹配
  platform VARCHAR(50),                -- YouTube/Bilibili/TikTok 等
  platform_user_id VARCHAR(100),       -- 平台用户 ID
  avatar_url TEXT,                     -- 头像
  description TEXT,                    -- 介绍
  follower_count INTEGER DEFAULT 0,    -- 粉丝量
  channel_url TEXT,                    -- 频道链接
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为 videos 表添加外键
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES upstream_creators(id) ON DELETE SET NULL;

-- 索引
CREATE INDEX IF NOT EXISTS idx_upstream_creators_name ON upstream_creators(name);
CREATE INDEX IF NOT EXISTS idx_upstream_creators_platform ON upstream_creators(platform);
CREATE INDEX IF NOT EXISTS idx_videos_creator_id ON videos(creator_id);

-- RLS 策略
ALTER TABLE upstream_creators ENABLE ROW LEVEL SECURITY;

-- 公开读取：只读活跃的创作者
CREATE POLICY "upstream_creators_public_read" ON upstream_creators
  FOR SELECT USING (is_active = true);

-- service_role 完全访问
CREATE POLICY "upstream_creators_service_role_all" ON upstream_creators
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- updated_at 触发器
CREATE TRIGGER update_upstream_creators_updated_at
  BEFORE UPDATE ON upstream_creators
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 注释
COMMENT ON TABLE upstream_creators IS 'UP主/创作者表，管理视频来源的创作者信息';
COMMENT ON COLUMN upstream_creators.name IS '昵称，用于批量上传时的唯一匹配';
COMMENT ON COLUMN upstream_creators.platform IS '平台：youtube/bilibili/tiktok/instagram/twitter/other';
COMMENT ON COLUMN upstream_creators.platform_user_id IS '平台用户ID，用于跨平台关联';
COMMENT ON COLUMN upstream_creators.follower_count IS '粉丝量，用于排序展示';
