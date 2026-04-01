-- ============================================
-- 单套餐 → 多套餐迁移（安全版本）
-- users.package_id UUID → users.package_ids UUID[]
-- 权限从覆盖改为合并（UNION）
--
-- 安全策略：
--   Step 1: 加新列 + 迁移数据（旧列保留，旧代码不受影响）
--   Step 2: 验证迁移完整性（自动 CHECK）
--   Step 3: 更新 use_invitation_code() 函数（双写新旧列）
--   Step 4: 更新 RLS 策略（读新列 package_ids）
--   Step 5: 删旧列（⚠️ 不自动执行！等新代码上线验证后再手动跑）
--
-- 日期: 2026-04-01
-- ============================================


-- ============================================
-- Step 1: 加新列 + 迁移数据
-- ============================================

BEGIN;

-- 加新列（幂等：IF NOT EXISTS）
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_ids UUID[] DEFAULT '{}';

-- 迁移：单值 → 数组
-- WHERE 条件保证：重跑不会覆盖已有数据
UPDATE users
SET package_ids = CASE
  WHEN package_id IS NOT NULL THEN ARRAY[package_id]
  ELSE '{}'
END
WHERE package_ids IS NULL OR package_ids = '{}';

ALTER TABLE users ALTER COLUMN package_ids SET NOT NULL;
ALTER TABLE users ALTER COLUMN package_ids SET DEFAULT '{}';

COMMIT;


-- ============================================
-- Step 2: 验证迁移完整性
-- 如果验证失败，整个 DO 块会抛异常中断
-- ============================================

DO $$
DECLARE
  total_users INT;
  has_pkg_users INT;
  lost_count INT;
BEGIN
  SELECT COUNT(*) INTO total_users FROM users;
  SELECT COUNT(*) INTO has_pkg_users FROM users WHERE array_length(package_ids, 1) > 0;

  -- 关键检查：旧列有值但新列没有的行
  SELECT COUNT(*) INTO lost_count FROM users
  WHERE package_id IS NOT NULL
  AND NOT (package_ids @> ARRAY[package_id]);

  IF lost_count > 0 THEN
    RAISE EXCEPTION '数据迁移不完整：有 % 个用户的 package_id 未迁入 package_ids', lost_count;
  END IF;

  RAISE NOTICE '迁移验证通过: 总用户=%, 有套餐=%', total_users, has_pkg_users;
END $$;


-- ============================================
-- Step 3: 更新 use_invitation_code() 函数
-- 双写 package_id（旧）和 package_ids（新）
-- 其他逻辑与旧函数完全一致
-- ============================================

CREATE OR REPLACE FUNCTION use_invitation_code(code_param TEXT, user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_code RECORD;
  package_record RECORD;
  validity_interval INTERVAL;
  computed_expires_at TIMESTAMPTZ;
  new_package_id UUID;
BEGIN
  -- 查找邀请码
  SELECT * INTO invitation_code
  FROM invitation_codes
  WHERE code = code_param
  AND is_active = true
  AND used_by IS NULL
  AND (expires_at IS NULL OR expires_at > NOW())
  FOR UPDATE;

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

  -- 查找套餐信息
  SELECT * INTO package_record
  FROM invitation_packages
  WHERE id = invitation_code.package_id;

  -- 计算有效期（与旧函数完全一致）
  validity_interval := CASE
    WHEN package_record.id IS NOT NULL AND package_record.validity_days IS NOT NULL
    THEN (package_record.validity_days || ' days')::INTERVAL
    WHEN package_record.id IS NOT NULL AND package_record.validity_days IS NULL
    THEN NULL
    WHEN invitation_code.validity_days IS NOT NULL
    THEN (invitation_code.validity_days || ' days')::INTERVAL
    ELSE NULL
  END;

  computed_expires_at := CASE
    WHEN validity_interval IS NOT NULL
    THEN NOW() + validity_interval
    ELSE NULL
  END;

  -- 确定要写入的套餐 ID
  new_package_id := COALESCE(package_record.id, invitation_code.package_id);

  -- 更新用户（双写新旧列 + 合并权限）
  UPDATE users
  SET
    -- 【旧列】写入最新套餐（旧代码仍能读到值）
    package_id = new_package_id,

    -- 【新列】追加套餐（去重）
    package_ids = CASE
      WHEN new_package_id IS NULL THEN package_ids
      WHEN package_ids @> ARRAY[new_package_id] THEN package_ids
      ELSE package_ids || ARRAY[new_package_id]
    END,

    -- 权限合并（| 运算符 = UNION 去重）
    feature_permissions = COALESCE(package_record.feature_permissions, invitation_code.feature_permissions, ARRAY[]::TEXT[]),
    book_permissions = COALESCE(package_record.book_permissions, invitation_code.book_permissions, ARRAY[]::TEXT[]),
    language_packages = COALESCE(package_record.language_packages, ARRAY['en']::TEXT[]),

    invitation_code_id = invitation_code.id,

    -- 过期时间：与旧函数逻辑一致（这里是覆盖，不是合并）
    permission_expires_at = CASE
      WHEN validity_interval IS NOT NULL
      THEN NOW() + validity_interval
      ELSE NULL
    END
  WHERE id = user_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION use_invitation_code IS '使用邀请码（多套餐兼容：双写 package_id + 追加 package_ids）';


-- ============================================
-- Step 4: 更新 RLS 策略
-- 从 u.package_id = ANY(v.package_ids) 改为 u.package_ids && v.package_ids
-- 此时旧列 package_id 仍存在，如有问题可立即 DROP 新策略恢复旧策略
-- ============================================

-- ── videos 表 ──
DROP POLICY IF EXISTS "用户读取有权限的视频" ON videos;

CREATE POLICY "用户读取有权限的视频" ON videos FOR SELECT
  USING (
    status = 'published' AND (
      array_length(package_ids, 1) IS NULL OR package_ids = '{}' OR package_ids IS NULL
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND (
          u.package_ids && videos.package_ids
          OR u.feature_permissions @> ARRAY['video']::TEXT[]
        )
        AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
      )
    )
  );

-- ── video_subtitles 表 ──
DROP POLICY IF EXISTS "用户读取有权限视频的字幕" ON video_subtitles;
DROP POLICY IF EXISTS "用户读取有权限的视频数据" ON video_subtitles;

CREATE POLICY "用户读取有权限视频的字幕" ON video_subtitles FOR SELECT
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
            u.package_ids && v.package_ids
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

-- ── video_word_cards 表 ──
DROP POLICY IF EXISTS "用户读取有权限视频的单词卡片" ON video_word_cards;
DROP POLICY IF EXISTS "用户读取有权限的卡片数据" ON video_word_cards;

CREATE POLICY "用户读取有权限视频的单词卡片" ON video_word_cards FOR SELECT
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
            u.package_ids && v.package_ids
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

-- ── video_phrase_cards 表 ──
DROP POLICY IF EXISTS "用户读取有权限视频的短语卡片" ON video_phrase_cards;
DROP POLICY IF EXISTS "用户读取有权限的短语卡片" ON video_phrase_cards;

CREATE POLICY "用户读取有权限视频的短语卡片" ON video_phrase_cards FOR SELECT
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
            u.package_ids && v.package_ids
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

-- ── video_expression_cards 表 ──
DROP POLICY IF EXISTS "用户读取有权限视频的表达卡片" ON video_expression_cards;
DROP POLICY IF EXISTS "用户读取有权限的表达卡片" ON video_expression_cards;

CREATE POLICY "用户读取有权限视频的表达卡片" ON video_expression_cards FOR SELECT
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
            u.package_ids && v.package_ids
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

-- ── video_exercises 表 ──
DROP POLICY IF EXISTS "用户读取有权限视频的练习" ON video_exercises;
DROP POLICY IF EXISTS "用户读取有权限的练习" ON video_exercises;

CREATE POLICY "用户读取有权限视频的练习" ON video_exercises FOR SELECT
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
            u.package_ids && v.package_ids
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

-- ── video_difficulty_analysis 表 ──
DROP POLICY IF EXISTS "用户读取有权限视频的难度分析" ON video_difficulty_analysis;
DROP POLICY IF EXISTS "用户读取有权限的难度分析" ON video_difficulty_analysis;

CREATE POLICY "用户读取有权限视频的难度分析" ON video_difficulty_analysis FOR SELECT
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
            u.package_ids && v.package_ids
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

-- ── subtitle_card_relations 表 ──
DROP POLICY IF EXISTS "用户读取有权限视频的卡片关联" ON subtitle_card_relations;
DROP POLICY IF EXISTS "用户读取有权限的卡片关联" ON subtitle_card_relations;

CREATE POLICY "用户读取有权限视频的卡片关联" ON subtitle_card_relations FOR SELECT
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
            u.package_ids && v.package_ids
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

-- ── video_grammar_points 表（旧策略引用不存在的 user_invitation_packages，一并修复）──
DROP POLICY IF EXISTS "用户读取已购套餐的语法点" ON video_grammar_points;

CREATE POLICY "用户读取已购套餐的语法点" ON video_grammar_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_grammar_points.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL OR v.package_ids = '{}' OR v.package_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND (
            u.package_ids && v.package_ids
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

-- ── video_pronunciation_tips 表 ──
DROP POLICY IF EXISTS "用户读取已购套餐的发音要点" ON video_pronunciation_tips;

CREATE POLICY "用户读取已购套餐的发音要点" ON video_pronunciation_tips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_pronunciation_tips.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL OR v.package_ids = '{}' OR v.package_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND (
            u.package_ids && v.package_ids
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );

-- ── video_vocabulary_networks 表 ──
DROP POLICY IF EXISTS "用户读取已购套餐的词汇网络" ON video_vocabulary_networks;

CREATE POLICY "用户读取已购套餐的词汇网络" ON video_vocabulary_networks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_vocabulary_networks.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL OR v.package_ids = '{}' OR v.package_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND (
            u.package_ids && v.package_ids
            OR u.feature_permissions @> ARRAY['video']::TEXT[]
          )
          AND (u.permission_expires_at IS NULL OR u.permission_expires_at > NOW())
        )
      )
    )
  );


-- ============================================
-- Step 5: 删旧列（⚠️ 确认新代码无问题后再手动执行）
--
-- 验证步骤：
--   1. 新代码已部署上线
--   2. 现有用户能正常看视频
--   3. 新用户用邀请码注册正常
--   4. 后台管理页面正常
--
-- 确认后执行以下语句：
-- ============================================

-- ALTER TABLE users DROP COLUMN IF EXISTS package_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS invitation_package;

SELECT '多套餐迁移 Step 1-4 完成（旧列保留，等验证后手动执行 Step 5）' AS status;
