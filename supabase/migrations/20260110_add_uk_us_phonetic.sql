-- 添加英式和美式音标字段
ALTER TABLE words
ADD COLUMN uk_phonetic text,
ADD COLUMN us_phonetic text;

-- 添加注释
COMMENT ON COLUMN words.uk_phonetic IS '英式音标';
COMMENT ON COLUMN words.us_phonetic IS '美式音标';
