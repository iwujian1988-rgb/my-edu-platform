-- ============================================================
-- 多语言支持字段迁移
-- 执行时间: 2025-02-25
-- 说明: 添加日语、韩语等多语言学习支持
-- ============================================================

-- 1. 添加语言标识字段
ALTER TABLE words ADD COLUMN IF NOT EXISTS source_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE words ADD COLUMN IF NOT EXISTS target_language VARCHAR(10) DEFAULT 'zh';

-- 2. 添加发音字段（多语言通用）
ALTER TABLE words ADD COLUMN IF NOT EXISTS kana TEXT;           -- 日语假名
ALTER TABLE words ADD COLUMN IF NOT EXISTS romaji TEXT;         -- 罗马音（日语/韩语）
ALTER TABLE words ADD COLUMN IF NOT EXISTS pronunciation TEXT;  -- 国际音标（通用）

-- 3. 添加备用释义字段
ALTER TABLE words ADD COLUMN IF NOT EXISTS definition_alt TEXT; -- 备用释义（如英文）

-- 4. 添加例句备用字段
ALTER TABLE words ADD COLUMN IF NOT EXISTS example_sentence_alt TEXT; -- 备用例句翻译

-- 5. 添加语言特定的词性字段
ALTER TABLE words ADD COLUMN IF NOT EXISTS part_of_speech_native TEXT; -- 原语言词性

-- 6. 更新现有数据的语言标识（英语学习）
UPDATE words SET
  source_language = 'en',
  target_language = 'zh'
WHERE source_language IS NULL;

-- 7. 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_words_source_language ON words(source_language);
CREATE INDEX IF NOT EXISTS idx_words_target_language ON words(target_language);

-- ============================================================
-- 字段说明：
-- source_language: 源语言代码 (en=英语, ja=日语, ko=韩语, fr=法语...)
-- target_language: 目标语言代码 (zh=中文, en=英文...)
-- kana: 日语假名（平假名/片假名）
-- romaji: 罗马音（日语罗马字/韩语罗马字）
-- pronunciation: 国际音标或其他注音
-- definition_alt: 备用释义（如学日语时提供英文释义）
-- example_sentence_alt: 备用例句翻译
-- part_of_speech_native: 原语言词性（如日语的动词分类）
-- ============================================================
