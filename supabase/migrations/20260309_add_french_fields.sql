-- 添加法语特有字段
-- 用于支持法语单词的性别、复数、变位、阴性形式

-- 添加 gender（性别）字段 - m: 阳性, f: 阴性
ALTER TABLE words
ADD COLUMN IF NOT EXISTS gender TEXT
CHECK (gender IN ('m', 'f', 'm/f', 'n'));

-- 添加 plural（复数形式）字段
ALTER TABLE words
ADD COLUMN IF NOT EXISTS plural TEXT;

-- 添加 conjugation（动词变位）字段 - 存储为 JSON
ALTER TABLE words
ADD COLUMN IF NOT EXISTS conjugation JSONB;

-- 添加 feminine_form（形容词阴性形式）字段
ALTER TABLE words
ADD COLUMN IF NOT EXISTS feminine_form TEXT;

-- 添加注释
COMMENT ON COLUMN words.gender IS '法语名词性别: m=阳性, f=阴性, m/f=阴阳皆可, n=中性（其他语言）';
COMMENT ON COLUMN words.plural IS '法语名词复数形式，如: cheval -> chevaux';
COMMENT ON COLUMN words.conjugation IS '动词变位，存储为JSON对象，如: {"present": ["suis", "es", "est", "sommes", "êtes", "sont"]}';
COMMENT ON COLUMN words.feminine_form IS '形容词阴性形式，如: grand -> grande';

-- 创建索引（可选，用于按性别筛选）
CREATE INDEX IF NOT EXISTS idx_words_gender ON words(gender) WHERE gender IS NOT NULL;
