-- ============================================
-- 重构视频套餐系统 - 复用现有 invitation_packages
-- 版本: v2.0
-- 日期: 2026-03-18
-- 说明: 删除独立的 video_packages，视频直接关联 invitation_packages
-- ============================================

-- ============================================
-- Part 1: 在 videos 表添加 package_ids 字段
-- ============================================

-- 添加 package_ids 字段（关联 invitation_packages）
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS package_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN videos.package_ids IS '关联的邀请码套餐ID数组，用户拥有任一套餐即可观看';

-- 删除旧的单独 package_id 字段（如果存在）
ALTER TABLE videos DROP COLUMN IF EXISTS package_id;

-- ============================================
-- Part 2: 数据迁移（将现有关联迁移到新字段）
-- ============================================

-- 将 package_video_relations 的数据迁移到 videos.package_ids
UPDATE videos v
SET package_ids = ARRAY(
  SELECT pvr.package_id::UUID
  FROM package_video_relations pvr
  WHERE pvr.video_id = v.id
)::UUID[]
WHERE EXISTS (
  SELECT 1 FROM package_video_relations pvr
  WHERE pvr.video_id = v.id
);

-- ============================================
-- Part 3: 删除不需要的表（保留数据备份后再删除）
-- ============================================

-- 注意：在生产环境执行前，请确保已备份数据

-- 删除 user_video_packages 表（用户视频套餐关联）
DROP TABLE IF EXISTS user_video_packages;

-- 删除 package_video_relations 表（视频-套餐关联）
DROP TABLE IF EXISTS package_video_relations;

-- 删除 video_packages 表（视频套餐）
DROP TABLE IF EXISTS video_packages;

-- ============================================
-- Part 4: 更新 RLS 策略
-- ============================================

-- 删除旧的 RLS 策略
DROP POLICY IF EXISTS "用户读取已购套餐的视频数据" ON video_subtitles;
DROP POLICY IF EXISTS "用户读取已购套餐的卡片数据" ON video_word_cards;
DROP POLICY IF EXISTS "用户读取已购套餐的短语卡片" ON video_phrase_cards;
DROP POLICY IF EXISTS "用户读取已购套餐的表达卡片" ON video_expression_cards;
DROP POLICY IF EXISTS "用户读取已购套餐的练习" ON video_exercises;
DROP POLICY IF EXISTS "用户读取已购套餐的难度分析" ON video_difficulty_analysis;
DROP POLICY IF EXISTS "用户读取已购套餐的卡片关联" ON subtitle_card_relations;
DROP POLICY IF EXISTS "用户读取已购套餐的关联" ON package_video_relations;

-- 创建新的 RLS 策略（基于 invitation_packages）

-- 用户读取有权限的视频
-- 权限条件：用户有 'video' 功能权限 OR 用户的 package_id 在视频的 package_ids 中
CREATE OR REPLACE POLICY "用户读取有权限的视频" ON videos FOR SELECT
  USING (
    status = 'published' AND (
      -- 条件1：视频未关联任何套餐（公开视频）
      array_length(package_ids, 1) IS NULL OR package_ids = '{}' OR package_ids IS NULL
      OR
      -- 条件2：用户的套餐在视频的套餐列表中
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND (
          u.package_id = ANY(videos.package_ids)
          OR
          u.feature_permissions @> ARRAY['video']::TEXT[]
        )
        AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
      )
    )
  );

-- 视频相关数据的读取策略（基于视频访问权限）
CREATE OR REPLACE POLICY "用户读取有权限视频的字幕" ON video_subtitles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_subtitles.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL OR v.package_ids = '{}' OR v.package_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND (
            u.package_id = ANY(v.package_ids)
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

CREATE OR REPLACE POLICY "用户读取有权限视频的单词卡片" ON video_word_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_word_cards.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL OR v.package_ids = '{}' OR v.package_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND (
            u.package_id = ANY(v.package_ids)
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

CREATE OR REPLACE POLICY "用户读取有权限视频的短语卡片" ON video_phrase_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_phrase_cards.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL OR v.package_ids = '{}' OR v.package_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND (
            u.package_id = ANY(v.package_ids)
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

CREATE OR REPLACE POLICY "用户读取有权限视频的表达卡片" ON video_expression_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_expression_cards.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL OR v.package_ids = '{}' OR v.package_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND (
            u.package_id = ANY(v.package_ids)
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

CREATE OR REPLACE POLICY "用户读取有权限视频的练习" ON video_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_exercises.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL OR v.package_ids = '{}' OR v.package_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND (
            u.package_id = ANY(v.package_ids)
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

CREATE OR REPLACE POLICY "用户读取有权限视频的难度分析" ON video_difficulty_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_difficulty_analysis.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL OR v.package_ids = '{}' OR v.package_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND (
            u.package_id = ANY(v.package_ids)
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

CREATE OR REPLACE POLICY "用户读取有权限视频的卡片关联" ON subtitle_card_relations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_subtitles vs
      JOIN videos v ON v.id = vs.video_id
      WHERE vs.id = subtitle_card_relations.subtitle_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL OR v.package_ids = '{}' OR v.package_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND (
            u.package_id = ANY(v.package_ids)
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

-- ============================================
-- Part 5: 更新 use_invitation_code 函数
-- 移除视频套餐相关逻辑（因为不再需要单独的 user_video_packages 表）
-- ============================================

CREATE OR REPLACE FUNCTION use_invitation_code(code_param TEXT, user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_code RECORD;
  package_record RECORD;
  validity_interval INTERVAL;
BEGIN
  -- 查找邀请码
  SELECT * INTO invitation_code
  FROM invitation_codes
  WHERE code = code_param
  AND is_active = true
  AND used_by IS NULL
  AND (expires_at IS NULL OR expires_at > NOW())
  FOR UPDATE;

  -- 如果邀请码不存在或已使用
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 标记邀请码为已使用
  UPDATE invitation_codes
  SET
    used_by = user_id_param,
    used_at = NOW(),
    used_count = used_count + 1
  WHERE id = invitation_code.id;

  -- 查找套餐信息（如果有关联）
  SELECT * INTO package_record
  FROM invitation_packages
  WHERE id = invitation_code.package_id;

  -- 计算有效期
  validity_interval := CASE
    WHEN package_record.id IS NOT NULL AND package_record.validity_days IS NOT NULL
    THEN (package_record.validity_days || ' days')::INTERVAL
    WHEN package_record.id IS NOT NULL AND package_record.validity_days IS NULL
    THEN NULL
    WHEN invitation_code.validity_days IS NOT NULL
    THEN (invitation_code.validity_days || ' days')::INTERVAL
    ELSE NULL
  END;

  -- 更新用户权限
  -- 复用现有套餐系统：
  -- - package_id: 用户当前套餐
  -- - feature_permissions: 功能权限（包含 'video' 表示有视频权限）
  -- - book_permissions: 单词书权限
  UPDATE users
  SET
    package_id = COALESCE(package_record.id, invitation_code.package_id),
    feature_permissions = COALESCE(package_record.feature_permissions, invitation_code.feature_permissions, ARRAY[]::TEXT[]),
    book_permissions = COALESCE(package_record.book_permissions, invitation_code.book_permissions, ARRAY[]::TEXT[]),
    invitation_code_id = invitation_code.id,
    permission_expires_at = CASE
      WHEN validity_interval IS NOT NULL
      THEN NOW() + validity_interval
      ELSE NULL
    END
  WHERE id = user_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION use_invitation_code IS '使用邀请码注册（复用现有 invitation_packages 套餐系统）';

-- ============================================
-- Part 6: 删除之前错误添加的 invitation_packages.video_package_ids 字段
-- ============================================

ALTER TABLE invitation_packages DROP COLUMN IF EXISTS video_package_ids;

-- ============================================
-- 完成
-- ============================================
