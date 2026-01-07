-- 添加消消乐游戏计数字段到 word_progress 表
ALTER TABLE word_progress
ADD COLUMN match_count INTEGER DEFAULT 0,
ADD COLUMN fail_count INTEGER DEFAULT 0;

-- 添加注释
COMMENT ON COLUMN word_progress.match_count IS '消消乐匹配成功次数（用于智能累积系统）';
COMMENT ON COLUMN word_progress.fail_count IS '消消乐匹配失败次数（用于智能累积系统）';
