/**
 * 演说家模块 - 历史听写记录错题迁移到魔鬼生词本
 *
 * 问题：在 speaker_ghost_words 表创建之前，用户可能有历史听写记录，
 *       这些记录中的错题没有被添加到生词本。
 *
 * 解决：从 speaker_dictation_submissions.answers 中提取错题，
 *       生成对应的 speaker_ghost_words 记录。
 *
 * 执行方式：
 * 1. 在 Supabase SQL Editor 中执行此脚本
 * 2. 或者通过 Supabase CLI: supabase db push
 */

-- ========================================
-- 1. 创建迁移函数
-- ========================================

CREATE OR REPLACE FUNCTION migrate_historical_wrong_words()
RETURNS TABLE(
  submission_id UUID,
  article_id UUID,
  user_id UUID,
  words_added INTEGER
) AS $$
DECLARE
  submission_record RECORD;
  answer_entry RECORD;
  wrong_word_record RECORD;
  word_to_add TEXT;
  sentence_index INTEGER;
  word_index INTEGER;
  article_sentences JSONB;
  sentence_text TEXT;
  sentence_start_time DECIMAL(10, 3);
  words_added_count INTEGER;
BEGIN
  -- 遍历所有听写提交记录
  FOR submission_record IN
    SELECT id, user_id, article_id, answers, created_at
    FROM speaker_dictation_submissions
    WHERE created_at < '2026-02-06'::date  -- 只处理历史记录
    ORDER BY created_at ASC
  LOOP
    words_added_count := 0;

    -- 获取文章句子数据
    SELECT json_data->'sentences' INTO article_sentences
    FROM speaker_articles
    WHERE id = submission_record.article_id;

    -- 遍历每个句子的答案
    FOR answer_entry IN
      SELECT
        (key)::INTEGER AS sentence_idx,
        value->>'userWords' AS user_words_json,
        value->>'correctWords' AS correct_words_json
      FROM jsonb_each_text(submission_record.answers)
    LOOP
      -- 解析 JSON 数组（注意：PostgreSQL 的 json_each 处理方式）
      DECLARE
        user_words_array TEXT[] := ARRAY(
          SELECT jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(answer_entry.user_words_json::jsonb) = 'array'
              THEN answer_entry.user_words_json::jsonb
              ELSE '[]'::jsonb
            END
          )
        );
        correct_words_array TEXT[] := ARRAY(
          SELECT jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(answer_entry.correct_words_json::jsonb) = 'array'
              THEN answer_entry.correct_words_json::jsonb
              ELSE '[]'::jsonb
            END
          )
        );
      BEGIN
        -- 遍历每个单词
        FOR word_index IN 1..array_length(correct_words_array, 1) LOOP
          DECLARE
            user_word TEXT := user_words_array[word_index];
            correct_word TEXT := correct_words_array[word_index];
            should_add BOOLEAN := FALSE;
            error_type TEXT := 'wrong';
          BEGIN
            -- 判断是否为错题
            IF user_word IS NULL OR trim(user_word) = '' THEN
              should_add := TRUE;
              error_type := 'skipped';
            ELSIF lower(trim(user_word)) != lower(trim(correct_word)) THEN
              should_add := TRUE;
              error_type := 'wrong';
            END IF;

            -- 如果是错题，添加到生词本
            IF should_add THEN
              -- 获取句子信息
              IF article_sentences IS NOT NULL THEN
                SELECT
                  (article_sentences->(answer_entry.sentence_idx)->>'text'),
                  (article_sentences->(answer_entry.sentence_idx)->>'start_time')::DECIMAL(10, 3)
                INTO sentence_text, sentence_start_time;
              ELSE
                sentence_text := 'Sentence text not available';
                sentence_start_time := NULL;
              END IF;

              -- 插入到 speaker_ghost_words（使用 ON CONFLICT 避免重复）
              INSERT INTO speaker_ghost_words (
                user_id,
                word,
                article_id,
                sentence_id,
                sentence_text,
                start_time,
                error_type,
                is_mastered,
                created_at
              ) VALUES (
                submission_record.user_id,
                correct_word,
                submission_record.article_id,
                answer_entry.sentence_idx,
                sentence_text,
                sentence_start_time,
                error_type,
                false,
                submission_record.created_at
              )
              ON CONFLICT (user_id, word, article_id, sentence_id) DO NOTHING;

              words_added_count := words_added_count + 1;
            END IF;
          END;
        END LOOP;
      END;
    END LOOP;

    -- 返回结果
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. 执行迁移
-- ========================================

-- 执行迁移函数
SELECT * FROM migrate_historical_wrong_words();

-- ========================================
-- 3. 验证结果
-- ========================================

-- 统计迁移的错题数量
SELECT
  COUNT(*) AS total_ghost_words,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT article_id) AS unique_articles
FROM speaker_ghost_words
WHERE created_at < '2026-02-06'::date;

-- 查看示例数据
SELECT
  sgw.word,
  sgw.error_type,
  sa.title AS article_title,
  sgw.created_at
FROM speaker_ghost_words sgw
JOIN speaker_articles sa ON sgw.article_id = sa.id
WHERE sgw.created_at < '2026-02-06'::date
ORDER BY sgw.created_at DESC
LIMIT 10;

-- ========================================
-- 4. 清理（可选）
-- ========================================

-- 迁移完成后，可以删除迁移函数（如果不再需要）
-- DROP FUNCTION IF EXISTS migrate_historical_wrong_words();
