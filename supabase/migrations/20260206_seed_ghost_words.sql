/**
 * 插入测试生词数据
 *
 * 用于测试生词本功能
 */

-- 首先获取已存在的文章 ID
DO $$
DECLARE
  v_article_id_1 uuid;
  v_article_id_2 uuid;
  v_user_id uuid := '00000000-0000-0000-0000-000000000001'; -- 测试用户 ID
BEGIN
  -- 获取第一篇文章（A Day at the Park）
  SELECT id INTO v_article_id_1
  FROM speaker_articles
  WHERE title = 'A Day at the Park'
  LIMIT 1;

  -- 获取第二篇文章（My Best Friend）
  SELECT id INTO v_article_id_2
  FROM speaker_articles
  WHERE title = 'My Best Friend'
  LIMIT 1;

  -- 如果找不到文章，抛出错误
  IF v_article_id_1 IS NULL THEN
    RAISE NOTICE '⚠️ 未找到文章 "A Day at the Park"，请先运行 20260206_seed_speaker_data.sql';
    RETURN;
  END IF;

  -- 插入测试生词（来自第一篇文章）
  INSERT INTO speaker_ghost_words (
    id,
    user_id,
    word,
    article_id,
    sentence_id,
    sentence_text,
    start_time,
    error_type,
    phonetic,
    definition,
    example_sentence,
    is_mastered
  ) VALUES
    (
      uuid_generate_v4(),
      v_user_id,
      'beautiful',
      v_article_id_1,
      1,
      'The weather was beautiful and the sun was shining brightly.',
      5.2,
      'wrong',
      '/ˈbjuːtɪfl/',
      '美丽的；漂亮的',
      'The sunset was beautiful.',
      false
    ),
    (
      uuid_generate_v4(),
      v_user_id,
      'relaxed',
      v_article_id_1,
      4,
      'I felt very happy and relaxed walking there.',
      21.3,
      'skipped',
      '/rɪˈlækst/',
      '放松的；轻松的',
      'I felt relaxed after the vacation.',
      false
    );

  IF v_article_id_2 IS NOT NULL THEN
    -- 插入测试生词（来自第二篇文章）
    INSERT INTO speaker_ghost_words (
      id,
      user_id,
      word,
      article_id,
      sentence_id,
      sentence_text,
      start_time,
      error_type,
      phonetic,
      definition,
      example_sentence,
      is_mastered
    ) VALUES
      (
        uuid_generate_v4(),
        v_user_id,
        'handsome',
        v_article_id_2,
        2,
        'Tom is tall and handsome with short black hair.',
        7.8,
        'wrong',
        '/ˈhænsəm/',
        '英俊的',
        'He is a handsome young man.',
        false
      ),
      (
        uuid_generate_v4(),
        v_user_id,
        'wonderful',
        v_article_id_2,
        6,
        'I am lucky to have such a wonderful friend.',
        26.2,
        'skipped',
        '/ˈwʌndəfl/',
      '精彩的；奇妙的',
        'We had a wonderful time.',
        false
      );
  END IF;

  RAISE NOTICE '✅ 测试生词数据插入成功！';
  RAISE NOTICE '已插入测试生词：beautiful, relaxed, handsome, wonderful';
  RAISE NOTICE '';
  RAISE NOTICE '现在可以访问：http://localhost:3000/speaker/ghost-words';
END $$;
