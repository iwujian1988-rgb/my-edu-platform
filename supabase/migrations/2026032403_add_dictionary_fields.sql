-- 添加词典扩展字段
-- 用于存储更丰富的词典信息：性别、CEFR等级、多条释义、多个例句

-- 1. 添加性别字段（法语名词阴阳性）
ALTER TABLE video_word_cards
ADD COLUMN IF NOT EXISTS gender TEXT;

COMMENT ON COLUMN video_word_cards.gender IS '名词性别（法语：m=阳性, f=阴性）';

-- 2. 添加 CEFR 等级原始值（A1-C2）
ALTER TABLE video_word_cards
ADD COLUMN IF NOT EXISTS cefr_level TEXT;

COMMENT ON COLUMN video_word_cards.cefr_level IS 'CEFR等级原始值（A1/A2/B1/B2/C1/C2）';

-- 3. 添加多条释义（JSON 数组）
ALTER TABLE video_word_cards
ADD COLUMN IF NOT EXISTS definitions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN video_word_cards.definitions IS '多条释义数组 ["释义1", "释义2", ...]';

-- 4. 添加多个例句（JSON 数组）
ALTER TABLE video_word_cards
ADD COLUMN IF NOT EXISTS examples JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN video_word_cards.examples IS '例句数组 [{"fr": "法语例句", "zh": "中文翻译"}, ...]';

-- 5. 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_video_word_cards_cefr_level ON video_word_cards(cefr_level);
CREATE INDEX IF NOT EXISTS idx_video_word_cards_gender ON video_word_cards(gender);
