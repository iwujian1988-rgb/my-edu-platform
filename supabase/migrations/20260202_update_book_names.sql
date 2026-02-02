-- ============================================
-- 更新考试类词书名称和描述
-- 日期: 2026-02-02
-- 说明:
--   1. 添加 abbreviation 字段存储英文缩写
--   2. 简化词书名称为中文通用说法
--   3. 在描述开头添加英文缩写
-- ============================================

-- 1. 添加 abbreviation 字段
ALTER TABLE books ADD COLUMN IF NOT EXISTS abbreviation TEXT;

-- 2. 更新 CET-4
UPDATE books
SET
  title = '四级',
  abbreviation = 'CET-4',
  description = 'CET-4（大学英语四级）词汇精选，覆盖考试高频核心词，配以实用搭配和例句，助你轻松突破四级词汇关'
WHERE title = 'CET-4';

-- 3. 更新 CET-6
UPDATE books
SET
  title = '六级',
  abbreviation = 'CET-6',
  description = 'CET-6（大学英语六级）进阶词汇，涵盖学术阅读、写作高频词，适合已过四级同学向更高水平进阶'
WHERE title = 'CET-6';

-- 4. 更新 IELTS
UPDATE books
SET
  title = '雅思',
  abbreviation = 'IELTS',
  description = 'IELTS（雅思）考试核心词汇，覆盖学术类与培训类场景，配以真题例句，助力听说读写全面突破'
WHERE title = 'IELTS';

-- 5. 更新 TOEFL
UPDATE books
SET
  title = '托福',
  abbreviation = 'TOEFL',
  description = 'TOEFL（托福）考试必备词汇库，涵盖学术场景与校园生活核心词汇，助你突破托福词汇瓶颈，轻松应对听说读写'
WHERE title = 'TOEFL';

-- 6. 更新专业英语四级
UPDATE books
SET
  title = '专四',
  abbreviation = 'TEM-4',
  description = 'TEM-4（专业英语四级）基础阶段词汇库，系统覆盖基础到中级词汇，适合英语专业大一、大二学生夯实基础'
WHERE title = '专业英语四级';

-- 7. 更新专业英语八级
UPDATE books
SET
  title = '专八',
  abbreviation = 'TEM-8',
  description = 'TEM-8（专业英语八级）高级词汇，专为英语专业高年级学生设计，覆盖文学、语言学、翻译等高级词汇，助力TEM-8考试与学术研究'
WHERE title = '专业英语八级';

-- 8. 验证更新结果
SELECT
  title,
  abbreviation,
  SUBSTRING(description, 1, 60) as description_preview,
  total_words
FROM books
WHERE title IN ('四级', '六级', '雅思', '托福', '专四', '专八', '考研')
ORDER BY title;
