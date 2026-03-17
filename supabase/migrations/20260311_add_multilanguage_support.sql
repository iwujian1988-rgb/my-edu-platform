-- ============================================================
-- 多语种支持迁移
-- ============================================================
-- 目标：支持英语、法语、德语、西班牙语、日语、意大利语、俄语等
-- 原则：
--   1. 零影响 - 默认英语，保护现有数据
--   2. 可扩展 - 使用 JSONB 存储语种特有数据
--   3. 安全性 - 严格约束，防止脏数据
--   4. 性能 - GIN 索引支持高效 JSON 查询
--
-- 执行顺序：
--   Step 1: 添加字段（带默认值和约束）
--   Step 2: 创建索引（性能优化）
--   Step 3: 迁移现有法语数据
--   Step 4: 创建辅助函数
--   Step 5: 验证迁移结果
-- ============================================================

-- ============================================
-- Step 1: 添加 books.language 字段（带约束）
-- ============================================

-- 添加语言字段，默认英语（保护现有线上英语数据）
ALTER TABLE books
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- 删除旧约束（如果存在）
ALTER TABLE books
DROP CONSTRAINT IF EXISTS books_language_check;

-- 添加严格的检查约束，只允许支持的语言
-- 防止脏数据写入
ALTER TABLE books
ADD CONSTRAINT books_language_check
CHECK (language IN ('en', 'fr', 'de', 'es', 'ja', 'it', 'ru'));

-- 添加注释
COMMENT ON COLUMN books.language IS '词库语言代码: en=英语(默认), fr=法语, de=德语, es=西班牙语, ja=日语, it=意大利语, ru=俄语';

-- ============================================
-- Step 2: 添加 words.language_data JSONB 字段
-- ============================================

-- 添加统一的语种数据字段（JSONB 格式，可扩展）
-- 结构示例:
-- {
--   "fr": {
--     "gender": "m",
--     "plural": "chevaux",
--     "conjugation": {"present": ["parle", "parles", ...]},
--     "feminine_form": "grande"
--   },
--   "de": {
--     "gender": "m",
--     "plural": "Pferde",
--     "cases": {"nominativ": "...", ...}
--   }
-- }
ALTER TABLE words
ADD COLUMN IF NOT EXISTS language_data JSONB DEFAULT NULL;

-- 添加注释
COMMENT ON COLUMN words.language_data IS '语种特有数据(JSONB)。key为语言代码，value为该语言的特有字段。如法语: {"fr": {"gender": "m", "plural": "chevaux"}}';

-- ============================================
-- Step 3: 创建索引（性能优化）
-- ============================================

-- 为 books.language 创建 B-tree 索引（精确查询）
CREATE INDEX IF NOT EXISTS idx_books_language ON books(language);

-- 为 words.language_data 创建 GIN 索引
-- 支持 JSONB 内部字段的高效查询，如:
--   SELECT * FROM words WHERE language_data->'fr'->>'gender' = 'm';
--   SELECT * FROM words WHERE language_data ? 'fr';
CREATE INDEX IF NOT EXISTS idx_words_language_data ON words USING GIN (language_data);

-- 为特定语言路径创建部分索引（可选，按需启用）
-- CREATE INDEX idx_words_french_gender ON words ((language_data->'fr'->>'gender'))
--   WHERE language_data->'fr'->>'gender' IS NOT NULL;

-- ============================================
-- Step 4: 更新现有书籍的语言标识
-- ============================================

-- 所有现有书籍显式设置为英语（确保一致性）
UPDATE books
SET language = 'en'
WHERE language IS NULL;

-- 识别法语书籍（通过标题包含 'French' 或 '法语' 或 '法文'）
UPDATE books
SET language = 'fr'
WHERE (title ILIKE '%french%' OR title ILIKE '%法语%' OR title ILIKE '%法文%')
  AND language = 'en';

-- 输出更新结果
DO $$
DECLARE
  v_en_count INTEGER;
  v_fr_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_en_count FROM books WHERE language = 'en';
  SELECT COUNT(*) INTO v_fr_count FROM books WHERE language = 'fr';

  RAISE NOTICE '书籍语言更新完成: en=%, fr=%', v_en_count, v_fr_count;
END $$;

-- ============================================
-- Step 5: 迁移现有法语数据到 language_data
-- ============================================

-- 将 words 表中现有的法语字段迁移到 language_data.fr 节点
-- 只迁移有数据的记录（旧字段不为空）
-- 使用 COALESCE 处理 NULL 值，保持 JSON 整洁

UPDATE words
SET language_data = jsonb_strip_nulls(jsonb_build_object(
  'fr', jsonb_build_object(
    'gender', gender,
    'plural', plural,
    'conjugation', conjugation,
    'feminine_form', feminine_form
  )
))
WHERE gender IS NOT NULL
   OR plural IS NOT NULL
   OR conjugation IS NOT NULL
   OR feminine_form IS NOT NULL;

-- 输出迁移结果
DO $$
DECLARE
  v_migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_migrated_count
  FROM words
  WHERE language_data IS NOT NULL
    AND language_data ? 'fr';

  RAISE NOTICE '法语数据迁移完成: % 条记录', v_migrated_count;
END $$;

-- ============================================
-- Step 6: 创建辅助函数
-- ============================================

-- 获取单词指定语言的数据
CREATE OR REPLACE FUNCTION get_word_language_data(
  p_word_id UUID,
  p_language VARCHAR(10)
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT language_data->p_language INTO result
  FROM words
  WHERE id = p_word_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_word_language_data IS '获取单词指定语言的数据，如 get_word_language_data(word_id, ''fr'')';

-- 检查书籍语言
CREATE OR REPLACE FUNCTION book_supports_language(
  p_book_id UUID,
  p_language VARCHAR(10)
)
RETURNS BOOLEAN AS $$
DECLARE
  book_lang VARCHAR(10);
BEGIN
  SELECT language INTO book_lang
  FROM books
  WHERE id = p_book_id;

  RETURN book_lang = p_language;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION book_supports_language IS '检查书籍是否支持指定语言';

-- 设置单词的语种数据（用于更新）
CREATE OR REPLACE FUNCTION set_word_language_data(
  p_word_id UUID,
  p_language VARCHAR(10),
  p_data JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE words
  SET language_data =
    COALESCE(language_data, '{}'::jsonb) || jsonb_build_object(p_language, p_data)
  WHERE id = p_word_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_word_language_data IS '设置单词的语种数据，如 set_word_language_data(word_id, ''fr'', ''{"gender": "m"}''::jsonb)';

-- ============================================
-- Step 7: 验证迁移结果
-- ============================================

-- 创建验证视图
CREATE OR REPLACE VIEW v_multilanguage_migration_status AS
SELECT
  'books_total' as metric,
  (SELECT COUNT(*) FROM books)::TEXT as value
UNION ALL
SELECT
  'books_english',
  (SELECT COUNT(*) FROM books WHERE language = 'en')::TEXT
UNION ALL
SELECT
  'books_french',
  (SELECT COUNT(*) FROM books WHERE language = 'fr')::TEXT
UNION ALL
SELECT
  'words_total',
  (SELECT COUNT(*) FROM words)::TEXT
UNION ALL
SELECT
  'words_with_language_data',
  (SELECT COUNT(*) FROM words WHERE language_data IS NOT NULL)::TEXT
UNION ALL
SELECT
  'words_with_french_data',
  (SELECT COUNT(*) FROM words WHERE language_data ? 'fr')::TEXT
UNION ALL
SELECT
  'migration_status',
  CASE
    WHEN (SELECT COUNT(*) FROM books WHERE language IS NULL) = 0
    THEN 'SUCCESS'
    ELSE 'NEEDS_ATTENTION'
  END;

COMMENT ON VIEW v_multilanguage_migration_status IS '多语种迁移状态验证视图';

-- ============================================
-- Step 8: 输出迁移完成信息
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '多语种迁移脚本执行完成！';
  RAISE NOTICE '';
  RAISE NOTICE '验证命令:';
  RAISE NOTICE '  SELECT * FROM v_multilanguage_migration_status;';
  RAISE NOTICE '';
  RAISE NOTICE '查询法语单词示例:';
  RAISE NOTICE '  SELECT word, language_data->''fr''->>''gender'' as gender';
  RAISE NOTICE '  FROM words WHERE language_data ? ''fr'' LIMIT 5;';
  RAISE NOTICE '';
  RAISE NOTICE '注意事项:';
  RAISE NOTICE '  1. 旧的 gender/plural/conjugation/feminine_form 字段保留';
  RAISE NOTICE '  2. 新数据应写入 language_data 字段';
  RAISE NOTICE '  3. 确认无问题后可考虑清理旧字段（建议保留一段时间）';
  RAISE NOTICE '============================================================';
END $$;
