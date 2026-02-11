/**
 * 优化 speaker_ghost_words 查询性能
 *
 * 问题：查询生词列表时需要过滤 user_id 和 is_mastered，然后按 created_at 排序
 * 解决：添加组合索引 (user_id, is_mastered, created_at)
 */

-- 删除旧的单独索引（已被组合索引替代）
DROP INDEX IF EXISTS idx_speaker_ghost_words_user_id;
DROP INDEX IF EXISTS idx_speaker_ghost_words_is_mastered;

-- 创建组合索引，覆盖查询的所有过滤和排序条件
CREATE INDEX idx_speaker_ghost_words_user_mastered_created
  ON speaker_ghost_words(user_id, is_mastered, created_at DESC);

-- 添加注释
COMMENT ON INDEX idx_speaker_ghost_words_user_mastered_created IS
  '组合索引优化魔鬼生词本查询：按用户和掌握状态过滤，按创建时间倒序';
