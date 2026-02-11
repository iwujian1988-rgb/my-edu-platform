/**
 * 修复早期测试数据
 *
 * 为现有的 speaker_articles 测试数据添加 language 和 category 字段
 */

-- ========================================
-- 1. 检查并添加字段（如果不存在）
-- ========================================

DO $$
BEGIN
    -- 检查 language 列是否存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'speaker_articles'
        AND column_name = 'language'
    ) THEN
        ALTER TABLE speaker_articles ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
        RAISE NOTICE '✅ 已添加 language 字段';
    ELSE
        RAISE NOTICE 'ℹ️  language 字段已存在';
    END IF;

    -- 检查 category 列是否存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'speaker_articles'
        AND column_name = 'category'
    ) THEN
        ALTER TABLE speaker_articles ADD COLUMN category TEXT NOT NULL DEFAULT '心理';
        RAISE NOTICE '✅ 已添加 category 字段';
    ELSE
        RAISE NOTICE 'ℹ️  category 字段已存在';
    END IF;
END $$;

-- ========================================
-- 2. 更新现有测试数据
-- ========================================

UPDATE speaker_articles
SET language = 'en', category = '生活'
WHERE title IN ('A Day at the Park', 'My Best Friend');

UPDATE speaker_articles
SET language = 'en', category = '学习'
WHERE title = 'The Importance of Reading';

-- ========================================
-- 3. 为测试文章创建对应的句子数据
-- ========================================

-- A Day at the Park (假设第一篇文章的 ID)
DO $$
DECLARE
    article_id UUID;
BEGIN
    -- 获取第一篇文章的 ID
    SELECT id INTO article_id
    FROM speaker_articles
    WHERE title = 'A Day at the Park'
    LIMIT 1;

    IF article_id IS NOT NULL THEN
        -- 检查是否已有句子数据
        IF NOT EXISTS (
            SELECT 1 FROM speaker_sentences
            WHERE article_id = article_id
            LIMIT 1
        ) THEN
            -- 插入句子数据
            INSERT INTO speaker_sentences (article_id, sentence_index, text, start_time, end_time) VALUES
            (article_id, 0, 'Yesterday, I went to the park near my house.', 0.0, 5.2),
            (article_id, 1, 'The weather was beautiful and the sun was shining brightly.', 5.2, 10.8),
            (article_id, 2, 'I saw many children playing on the swings and slides.', 10.8, 16.5),
            (article_id, 3, 'Some people were having picnics on the green grass.', 16.5, 21.3),
            (article_id, 4, 'I felt very happy and relaxed walking there.', 21.3, 26.0);

            RAISE NOTICE '✅ 已为 "A Day at the Park" 添加句子数据';
        ELSE
            RAISE NOTICE 'ℹ️  "A Day at the Park" 句子数据已存在';
        END IF;
    END IF;
END $$;

-- The Importance of Reading
DO $$
DECLARE
    article_id UUID;
BEGIN
    SELECT id INTO article_id
    FROM speaker_articles
    WHERE title = 'The Importance of Reading'
    LIMIT 1;

    IF article_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM speaker_sentences
            WHERE article_id = article_id
            LIMIT 1
        ) THEN
            INSERT INTO speaker_sentences (article_id, sentence_index, text, start_time, end_time) VALUES
            (article_id, 0, 'Reading is one of the most important skills a person can develop.', 0.0, 6.5),
            (article_id, 1, 'It opens doors to new worlds and expands our understanding of life.', 6.5, 12.8),
            (article_id, 2, 'Through books, we can travel to distant places without leaving our homes.', 12.8, 19.2),
            (article_id, 3, 'We can learn about different cultures, histories, and perspectives.', 19.2, 25.5),
            (article_id, 4, 'Reading also improves our vocabulary and communication skills.', 25.5, 31.0),
            (article_id, 5, 'Therefore, everyone should make reading a daily habit.', 31.0, 36.5);

            RAISE NOTICE '✅ 已为 "The Importance of Reading" 添加句子数据';
        END IF;
    END IF;
END $$;

-- My Best Friend
DO $$
DECLARE
    article_id UUID;
BEGIN
    SELECT id INTO article_id
    FROM speaker_articles
    WHERE title = 'My Best Friend'
    LIMIT 1;

    IF article_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM speaker_sentences
            WHERE article_id = article_id
            LIMIT 1
        ) THEN
            INSERT INTO speaker_sentences (article_id, sentence_index, text, start_time, end_time) VALUES
            (article_id, 0, 'I have a best friend named Tom.', 0.0, 3.5),
            (article_id, 1, 'We have known each other since kindergarten.', 3.5, 7.8),
            (article_id, 2, 'Tom is tall and handsome with short black hair.', 7.8, 12.3),
            (article_id, 3, 'He is very kind and always helps others.', 12.3, 16.8),
            (article_id, 4, 'We often play basketball together on weekends.', 16.8, 21.5),
            (article_id, 5, 'Sometimes we study at the library after school.', 21.5, 26.2),
            (article_id, 6, 'I am lucky to have such a wonderful friend.', 26.2, 31.0);

            RAISE NOTICE '✅ 已为 "My Best Friend" 添加句子数据';
        END IF;
    END IF;
END $$;

-- ========================================
-- 4. 验证结果
-- ========================================

DO $$
DECLARE
    article_count INTEGER;
    sentence_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO article_count FROM speaker_articles;
    SELECT COUNT(*) INTO sentence_count FROM speaker_sentences;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 测试数据修复完成！';
    RAISE NOTICE '📊 文章总数: %', article_count;
    RAISE NOTICE '📝 句子总数: %', sentence_count;
    RAISE NOTICE '========================================';
END $$;
