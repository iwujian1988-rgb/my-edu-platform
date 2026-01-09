-- 添加单词书统计字段
-- 用于在管理后台显示学习人数和完成率

-- 添加 learner_count 字段（学习人数）
ALTER TABLE books
ADD COLUMN IF NOT EXISTS learner_count INTEGER DEFAULT 0;

-- 添加 completion_rate 字段（完成率，百分比）
ALTER TABLE books
ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2) DEFAULT 0.00;

-- 添加注释
COMMENT ON COLUMN books.learner_count IS '学习该单词书的人数';
COMMENT ON COLUMN books.completion_rate IS '平均完成率（百分比0-100）';

-- 创建索引以加速按学习人数排序的查询
CREATE INDEX IF NOT EXISTS books_learner_count_idx
  ON books(learner_count DESC);

-- 创建索引以加速按完成率排序的查询
CREATE INDEX IF NOT EXISTS books_completion_rate_idx
  ON books(completion_rate DESC);

-- 添加触发器，在创建新的学习记录时自动更新统计（可选，后续实现）
-- 这个触发器会在用户开始学习某个单词书时自动增加 learner_count
-- CREATE OR REPLACE FUNCTION update_word_book_stats_on_start()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   UPDATE word_books
--   SET learner_count = learner_count + 1
--   WHERE id = NEW.book_id;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trigger_update_stats_on_start
-- AFTER INSERT ON user_word_books
-- FOR EACH ROW
-- EXECUTE FUNCTION update_word_book_stats_on_start();
