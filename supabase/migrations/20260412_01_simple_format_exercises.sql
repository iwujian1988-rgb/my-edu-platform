-- ============================================
-- Simple Format 学习资料 - 数据库迁移
-- 日期: 2026-04-12
-- 用途: 支持新学习资料格式的练习类型
-- ============================================

-- 扩展 exercise_type 支持选择题、翻译题、语法练习
ALTER TABLE video_exercises DROP CONSTRAINT IF EXISTS video_exercises_exercise_type_check;
ALTER TABLE video_exercises ADD CONSTRAINT video_exercises_exercise_type_check
  CHECK (exercise_type IN (
    'fill_blank', 'dictation', 'sentence_pattern', 'scenario',
    'multiple_choice', 'translation', 'grammar_drill'
  ));
