-- 添加单词书例句和用法字段
-- 区别于 example_from_video（视频中的例句），这是单词书自带的例句

ALTER TABLE video_word_cards
ADD COLUMN IF NOT EXISTS example_sentence TEXT,
ADD COLUMN IF NOT EXISTS example_sentence_cn TEXT,
ADD COLUMN IF NOT EXISTS collocation TEXT,
ADD COLUMN IF NOT EXISTS collocation_cn TEXT;

COMMENT ON COLUMN video_word_cards.example_sentence IS '单词书例句（原文）';
COMMENT ON COLUMN video_word_cards.example_sentence_cn IS '单词书例句（中文翻译）';
COMMENT ON COLUMN video_word_cards.collocation IS '搭配/用法（原文）';
COMMENT ON COLUMN video_word_cards.collocation_cn IS '搭配/用法（中文翻译）';
