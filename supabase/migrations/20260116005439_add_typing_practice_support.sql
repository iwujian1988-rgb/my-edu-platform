-- ============================================================================
-- 打字练习（肌肉训练）功能数据库迁移
-- 版本: v1.0.0
-- 日期: 2026-01-16
-- 说明: 扩展数据库以支持打字练习模式
-- 文档: typejishu.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 变更 1: 扩展 learning_records 表的 practice_mode 字段
-- ----------------------------------------------------------------------------

-- 步骤 1: 将 ENUM 改为 TEXT（支持扩展）
-- 注意：PostgreSQL 不支持直接修改 ENUM，需要先转换为 TEXT
ALTER TABLE learning_records
ALTER COLUMN practice_mode TYPE TEXT USING practice_mode::TEXT;

-- 步骤 2: 删除旧的约束（如果存在）
DROP CONSTRAINT IF EXISTS learning_records_practice_mode_check;

-- 步骤 3: 添加新的约束（包含 'typing'）
ALTER TABLE learning_records
ADD CONSTRAINT learning_records_practice_mode_check
CHECK (practice_mode IN ('dictation', 'match_game', 'flashcard', 'typing', NULL));

-- 步骤 4: 添加注释
COMMENT ON COLUMN learning_records.practice_mode IS '练习模式: dictation(听写) | match_game(消消乐) | flashcard(卡片) | typing(打字练习/肌肉训练) | NULL(其他模式)';

-- ----------------------------------------------------------------------------
-- 变更 2: 修改 word_progress 表（新增拼写统计字段）
-- ----------------------------------------------------------------------------

-- 添加拼写正确次数字段
ALTER TABLE word_progress
ADD COLUMN typing_correct_count INTEGER DEFAULT 0 NOT NULL;

COMMENT ON COLUMN word_progress.typing_correct_count IS '打字练习拼写正确次数（仅统计 typing 模式）';

-- 添加拼写总尝试次数字段
ALTER TABLE word_progress
ADD COLUMN typing_total_attempts INTEGER DEFAULT 0 NOT NULL;

COMMENT ON COLUMN word_progress.typing_total_attempts IS '打字练习总尝试次数（仅统计 typing 模式）';

-- 添加数据完整性约束
ALTER TABLE word_progress
ADD CONSTRAINT word_progress_typing_stats_check
CHECK (typing_correct_count >= 0 AND typing_total_attempts >= 0);

ALTER TABLE word_progress
ADD CONSTRAINT word_progress_typing_attempts_check
CHECK (typing_total_attempts >= typing_correct_count);

-- 添加上限约束（防止无限循环导致溢出）
ALTER TABLE word_progress
ADD CONSTRAINT word_progress_typing_total_attempts_limit_check
CHECK (typing_total_attempts <= 10000);

-- 添加 version 字段（用于乐观锁）
ALTER TABLE word_progress
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

COMMENT ON COLUMN word_progress.version IS '乐观锁版本号，每次更新自动递增';

-- ----------------------------------------------------------------------------
-- 变更 3: 修改 mistakes 表（新增拼写错误统计字段）
-- ----------------------------------------------------------------------------

-- 添加拼写错误次数字段
ALTER TABLE mistakes
ADD COLUMN typing_wrong_count INTEGER DEFAULT 0 NOT NULL;

COMMENT ON COLUMN mistakes.typing_wrong_count IS '打字练习拼写错误次数（连续错误累积）';

-- 添加数据完整性约束
ALTER TABLE mistakes
ADD CONSTRAINT mistakes_typing_wrong_count_check
CHECK (typing_wrong_count >= 0);

-- 添加上限约束（防止恶意或异常数据）
ALTER TABLE mistakes
ADD CONSTRAINT mistakes_typing_wrong_count_limit_check
CHECK (typing_wrong_count <= 1000);

-- ----------------------------------------------------------------------------
-- 变更 4: 添加索引（优化查询性能）
-- ----------------------------------------------------------------------------

-- 优化打字练习记录查询
CREATE INDEX IF NOT EXISTS idx_learning_records_typing_mode
ON learning_records(user_id, book_id, practice_mode)
WHERE practice_mode = 'typing';

-- 优化错题本查询（拼写错误）
CREATE INDEX IF NOT EXISTS idx_mistakes_typing_wrong_count
ON mistakes(user_id, book_id, typing_wrong_count)
WHERE typing_wrong_count > 0;

-- 优化错题本查询（已解决/未解决）
CREATE INDEX IF NOT EXISTS idx_mistakes_user_resolved
ON mistakes(user_id, book_id, is_resolved);

-- ----------------------------------------------------------------------------
-- 验证脚本（可选，用于验证迁移是否成功）
-- ----------------------------------------------------------------------------

-- 验证 learning_records 表
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'learning_records'
  AND column_name = 'practice_mode';

-- 验证 word_progress 表
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'word_progress'
  AND column_name IN ('typing_correct_count', 'typing_total_attempts', 'version');

-- 验证 mistakes 表
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'mistakes'
  AND column_name = 'typing_wrong_count';

-- 验证约束
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid::regclass::text IN ('word_progress', 'mistakes', 'learning_records')
  AND conname LIKE '%typing%';

-- 验证索引
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('learning_records', 'mistakes')
  AND indexname LIKE '%typing%';
