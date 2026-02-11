/**
 * 演说家模块 - 添加 Level 1 支持
 *
 * 修改 level 约束，支持 Level 1, 2, 3
 */

-- 删除旧的约束
ALTER TABLE speaker_articles DROP CONSTRAINT IF EXISTS speaker_articles_level_check;

-- 添加新的约束（支持 Level 1, 2, 3）
ALTER TABLE speaker_articles
  ADD CONSTRAINT speaker_articles_level_check
  CHECK (level IN (1, 2, 3));

COMMENT ON CONSTRAINT speaker_articles_level_check ON speaker_articles IS 'Level constraint: 1 (初级), 2 (中级), 3 (高级)';
