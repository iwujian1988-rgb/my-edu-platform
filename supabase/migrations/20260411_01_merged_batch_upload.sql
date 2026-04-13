-- ============================================
-- 合并格式批量上传 - 数据库迁移
-- 日期: 2026-04-11
-- 用途: 支持合并 JSON 格式上传新增的数据类型
-- ============================================

-- 1. video_exercises: 扩展 exercise_type 支持新练习类型
ALTER TABLE video_exercises DROP CONSTRAINT IF EXISTS video_exercises_exercise_type_check;
ALTER TABLE video_exercises ADD CONSTRAINT video_exercises_exercise_type_check
  CHECK (exercise_type IN ('fill_blank', 'dictation', 'sentence_pattern', 'scenario'));

-- 2. video_exercises: 新增 exercise_metadata 存储句型/情景练习的结构化数据
ALTER TABLE video_exercises
ADD COLUMN IF NOT EXISTS exercise_metadata JSONB DEFAULT NULL;

COMMENT ON COLUMN video_exercises.exercise_metadata IS
  '练习扩展元数据 (JSONB): sentence_pattern 类型存 {pattern, explanation, example:{french,chinese}}, scenario 类型存 {description, requirements[], starter}';

-- 3. video_pronunciation_tips: 新增联诵和语调字段
ALTER TABLE video_pronunciation_tips
ADD COLUMN IF NOT EXISTS liaison TEXT[];

ALTER TABLE video_pronunciation_tips
ADD COLUMN IF NOT EXISTS intonation TEXT;

COMMENT ON COLUMN video_pronunciation_tips.liaison IS
  '联诵/连读规则数组，从 merged format pronunciation.liaison 导入';
COMMENT ON COLUMN video_pronunciation_tips.intonation IS
  '语调描述，从 merged format pronunciation.intonation 导入';

-- 4. video_vocabulary_networks: 新增核心词字段
ALTER TABLE video_vocabulary_networks
ADD COLUMN IF NOT EXISTS core_word VARCHAR(255);

COMMENT ON COLUMN video_vocabulary_networks.core_word IS
  '词汇网络核心词，从 merged format vocabulary_network.core_word 导入';
