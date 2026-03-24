-- ============================================
-- 修复视频模块 RLS 策略
-- 问题: CREATE OR REPLACE POLICY 语法在 PostgreSQL 中无效
-- 解决: 先 DROP 再 CREATE
-- ============================================

-- 1. video_subtitles 表
DROP POLICY IF EXISTS "用户读取有权限视频的字幕" ON video_subtitles;
DROP POLICY IF EXISTS "用户读取有权限的视频数据" ON video_subtitles;

CREATE POLICY "用户读取有权限视频的字幕" ON video_subtitles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_subtitles.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL
        OR v.package_ids = '{}'
        OR v.package_ids IS NULL
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

-- 2. video_word_cards 表
DROP POLICY IF EXISTS "用户读取有权限视频的单词卡片" ON video_word_cards;
DROP POLICY IF EXISTS "用户读取有权限的卡片数据" ON video_word_cards;

CREATE POLICY "用户读取有权限视频的单词卡片" ON video_word_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_word_cards.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL
        OR v.package_ids = '{}'
        OR v.package_ids IS NULL
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

-- 3. video_phrase_cards 表
DROP POLICY IF EXISTS "用户读取有权限视频的短语卡片" ON video_phrase_cards;
DROP POLICY IF EXISTS "用户读取有权限的短语卡片" ON video_phrase_cards;

CREATE POLICY "用户读取有权限视频的短语卡片" ON video_phrase_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_phrase_cards.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL
        OR v.package_ids = '{}'
        OR v.package_ids IS NULL
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

-- 4. video_expression_cards 表
DROP POLICY IF EXISTS "用户读取有权限视频的表达卡片" ON video_expression_cards;
DROP POLICY IF EXISTS "用户读取有权限的表达卡片" ON video_expression_cards;

CREATE POLICY "用户读取有权限视频的表达卡片" ON video_expression_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_expression_cards.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL
        OR v.package_ids = '{}'
        OR v.package_ids IS NULL
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

-- 5. video_exercises 表
DROP POLICY IF EXISTS "用户读取有权限视频的练习" ON video_exercises;
DROP POLICY IF EXISTS "用户读取有权限的练习" ON video_exercises;

CREATE POLICY "用户读取有权限视频的练习" ON video_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_exercises.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL
        OR v.package_ids = '{}'
        OR v.package_ids IS NULL
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

-- 6. video_difficulty_analysis 表
DROP POLICY IF EXISTS "用户读取有权限视频的难度分析" ON video_difficulty_analysis;
DROP POLICY IF EXISTS "用户读取有权限的难度分析" ON video_difficulty_analysis;

CREATE POLICY "用户读取有权限视频的难度分析" ON video_difficulty_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_difficulty_analysis.video_id
      AND v.status = 'published'
      AND (
        array_length(v.package_ids, 1) IS NULL
        OR v.package_ids = '{}'
        OR v.package_ids IS NULL
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

-- 7. subtitle_card_relations 表
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
        array_length(v.package_ids, 1) IS NULL
        OR v.package_ids = '{}'
        OR v.package_ids IS NULL
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

-- 完成
SELECT 'RLS 策略修复完成' AS status;
