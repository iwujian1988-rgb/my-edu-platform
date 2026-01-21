-- ====================================================================
-- 卡片背单词测试数据导入脚本（使用现有测试用户）
-- 用途：为 flashcards-flow.spec.ts 提供干净的测试数据
-- 修改现有测试用户权限，添加测试词书
-- ====================================================================

-- ====================================================================
-- 1. 更新测试用户权限
-- ====================================================================

-- 更新测试用户权限（使用现有用户 ID: a2afbb4f-dd9c-46bc-a780-b286c1527292）
UPDATE public.users
SET
  feature_permissions = ARRAY['flashcards', 'dictation', 'match_game', 'custom_books']::TEXT[],
  book_permissions = ARRAY['all']::TEXT[],
  permission_expires_at = NOW() + INTERVAL '1 year'
WHERE id = 'a2afbb4f-dd9c-46bc-a780-b286c1527292';

-- 验证更新成功
SELECT
  id,
  phone_number,
  feature_permissions,
  book_permissions,
  permission_expires_at
FROM public.users
WHERE id = 'a2afbb4f-dd9c-46bc-a780-b286c1527292';

-- ====================================================================
-- 2. 创建测试词书
-- ====================================================================

INSERT INTO public.books (
  id,
  title,
  description,
  category,
  cover_url,
  total_words,
  total_chapters,
  is_published,
  created_at,
  updated_at
)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '测试-卡片背单词专用词书',
  '用于测试卡片背单词功能的专用词书，包含200个常用英语单词，所有单词初始状态为未标注（new）',
  'exam',
  NULL,
  200,
  1,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  total_words = EXCLUDED.total_words,
  updated_at = NOW();

-- ====================================================================
-- 3. 创建测试章节（words表必须关联chapter）
-- ====================================================================

INSERT INTO public.chapters (
  id,
  book_id,
  title,
  order_index,
  word_count,
  created_at
)
VALUES (
  '25000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '第一章',
  1,
  200,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 4. 创建测试单词（200个单词）
-- ====================================================================

INSERT INTO public.words (
  id,
  chapter_id,
  word,
  phonetic,
  part_of_speech,
  definition_en,
  definition,
  collocation_en,
  collocation,
  example_sentence_en,
  example_sentence,
  order_index,
  difficulty_score,
  created_at
) VALUES
-- 第1批：5个基础单词
(
  '30000000-0000-0000-0000-000000000001',
  '25000000-0000-0000-0000-000000000001',
  'ability',
  '/əˈbɪləti/',
  'noun',
  'The capacity to do something',
  '中文：能力，才能',
  'the ability to speak English',
  '中文：说英语的能力',
  'She has the ability to learn quickly.',
  '中文：她学东西很快。',
  1,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000002',
  '25000000-0000-0000-0000-000000000001',
  'book',
  '/bʊk/',
  'noun',
  'A written or printed work consisting of pages',
  '中文：书，书籍',
  'read a book',
  '中文：读书',
  'This is an interesting book.',
  '中文：这是一本有趣的书。',
  2,
  1,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000003',
  '25000000-0000-0000-0000-000000000001',
  'computer',
  '/kəmˈpjuːtər/',
  'noun',
  'An electronic device for storing and processing data',
  '中文：电脑，计算机',
  'personal computer',
  '中文：个人电脑',
  'I use my computer every day.',
  '中文：我每天都用电脑。',
  3,
  2,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000004',
  '25000000-0000-0000-0000-000000000001',
  'education',
  '/ˌedʒuˈkeɪʃn/',
  'noun',
  'The process of receiving or giving systematic instruction',
  '中文：教育',
  'higher education',
  '中文：高等教育',
  'Education is important for everyone.',
  '中文：教育对每个人都很重要。',
  4,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000005',
  '25000000-0000-0000-0000-000000000001',
  'freedom',
  '/ˈfriːdəm/',
  'noun',
  'The power or right to act, speak, or think as one wants',
  '中文：自由',
  'freedom of speech',
  '中文：言论自由',
  'We value our freedom.',
  '中文：我们珍视自由。',
  5,
  3,
  NOW()
),
-- 第2批：5个中级单词
(
  '30000000-0000-0000-0000-000000000006',
  '25000000-0000-0000-0000-000000000001',
  'government',
  '/ˈɡʌvərnmənt/',
  'noun',
  'The governing body of a nation, state, or community',
  '中文：政府',
  'local government',
  '中文：地方政府',
  'The government announced new policies.',
  '中文：政府宣布了新政策。',
  6,
  4,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000007',
  '25000000-0000-0000-0000-000000000001',
  'happiness',
  '/ˈhæpinəs/',
  'noun',
  'The state of being happy',
  '中文：幸福，快乐',
  'feel happiness',
  '中文：感到幸福',
  'Money cannot buy happiness.',
  '中文：金钱买不到幸福。',
  7,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000008',
  '25000000-0000-0000-0000-000000000001',
  'knowledge',
  '/ˈnɒlɪdʒ/',
  'noun',
  'Facts, information, and skills acquired through experience or education',
  '中文：知识',
  'scientific knowledge',
  '中文：科学知识',
  'Knowledge is power.',
  '中文：知识就是力量。',
  8,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000009',
  '25000000-0000-0000-0000-000000000001',
  'language',
  '/ˈlæŋɡwɪdʒ/',
  'noun',
  'The method of human communication',
  '中文：语言',
  'foreign language',
  '中文：外语',
  'English is a global language.',
  '中文：英语是一门全球性语言。',
  9,
  2,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000010',
  '25000000-0000-0000-0000-000000000001',
  'memory',
  '/ˈmeməri/',
  'noun',
  'The ability to remember things',
  '中文：记忆，记忆力',
  'good memory',
  '中文：好记性',
  'She has a good memory.',
  '中文：她记忆力很好。',
  10,
  2,
  NOW()
),
-- 第3批：5个高级单词
(
  '30000000-0000-0000-0000-000000000011',
  '25000000-0000-0000-0000-000000000001',
  'opportunity',
  '/ˌɒpəˈtjuːnəti/',
  'noun',
  'A set of circumstances that makes it possible to do something',
  '中文：机会，时机',
  'job opportunity',
  '中文：工作机会',
  'Don''t miss this opportunity.',
  '中文：不要错过这个机会。',
  11,
  4,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000012',
  '25000000-0000-0000-0000-000000000001',
  'philosophy',
  '/fɪˈlɒsəfi/',
  'noun',
  'The study of the fundamental nature of knowledge, reality, and existence',
  '中文：哲学',
  'Greek philosophy',
  '中文：希腊哲学',
  'Philosophy helps us think deeply.',
  '中文：哲学帮助我们深度思考。',
  12,
  5,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000013',
  '25000000-0000-0000-0000-000000000001',
  'technology',
  '/tekˈnɒlədʒi/',
  'noun',
  'The application of scientific knowledge for practical purposes',
  '中文：技术，科技',
  'modern technology',
  '中文：现代科技',
  'Technology changes rapidly.',
  '中文：技术变化很快。',
  13,
  4,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000014',
  '25000000-0000-0000-0000-000000000001',
  'understanding',
  '/ˌʌndəˈstændɪŋ/',
  'noun',
  'The ability to understand something',
  '中文：理解，理解力',
  'deep understanding',
  '中文：深刻理解',
  'I have a better understanding now.',
  '中文：我现在理解得更深了。',
  14,
  4,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000015',
  '25000000-0000-0000-0000-000000000001',
  'vocabulary',
  '/vəˈkæbjələri/',
  'noun',
  'The body of words used in a particular language',
  '中文：词汇，词汇量',
  'large vocabulary',
  '中文：词汇量大',
  'Reading improves your vocabulary.',
  '中文：阅读能提高词汇量。',
  15,
  4,
  NOW()
),
-- 第4批：5个常用动词
(
  '30000000-0000-0000-0000-000000000016',
  '25000000-0000-0000-0000-000000000001',
  'accomplish',
  '/əˈkʌmplɪʃ/',
  'verb',
  'To achieve or complete successfully',
  '中文：完成，实现',
  'accomplish a goal',
  '中文：实现目标',
  'Hard work helps you accomplish your dreams.',
  '中文：努力工作帮你实现梦想。',
  16,
  4,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000017',
  '25000000-0000-0000-0000-000000000001',
  'believe',
  '/bɪˈliːv/',
  'verb',
  'To accept something as true',
  '中文：相信，认为',
  'believe in yourself',
  '中文：相信自己',
  'I believe in you.',
  '中文：我相信你。',
  17,
  2,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000018',
  '25000000-0000-0000-0000-000000000001',
  'challenge',
  '/ˈtʃælɪndʒ/',
  'verb',
  'To call into question or dispute',
  '中文：挑战，质疑',
  'face a challenge',
  '中文：面对挑战',
  'Challenge yourself every day.',
  '中文：每天挑战自己。',
  18,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000019',
  '25000000-0000-0000-0000-000000000001',
  'develop',
  '/dɪˈveləp/',
  'verb',
  'To grow or cause to grow and become more mature',
  '中文：发展，开发',
  'develop a skill',
  '中文：培养技能',
  'Practice helps you develop skills.',
  '中文：练习帮你培养技能。',
  19,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000020',
  '25000000-0000-0000-0000-000000000001',
  'experience',
  '/ɪkˈspɪəriəns/',
  'verb',
  'To encounter or undergo something',
  '中文：经历，体验',
  'gain experience',
  '中文：获得经验',
  'Travel helps you experience new cultures.',
  '中文：旅行帮你体验新文化。',
  20,
  3,
  NOW()
),
-- 第5批：5个常用形容词
(
  '30000000-0000-0000-0000-000000000021',
  '25000000-0000-0000-0000-000000000001',
  'beautiful',
  '/ˈbjuːtɪfl/',
  'adjective',
  'Pleasing to the senses or mind',
  '中文：美丽的，漂亮的',
  'beautiful flower',
  '中文：漂亮的花',
  'She is a beautiful girl.',
  '中文：她是一个漂亮的女孩。',
  21,
  2,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000022',
  '25000000-0000-0000-0000-000000000001',
  'creative',
  '/kriˈeɪtɪv/',
  'adjective',
  'Having the ability to create',
  '中文：有创造力的',
  'creative idea',
  '中文：有创意的想法',
  'He is very creative.',
  '中文：他非常有创造力。',
  22,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000023',
  '25000000-0000-0000-0000-000000000001',
  'difficult',
  '/ˈdɪfɪkəlt/',
  'adjective',
  'Needing much effort or skill',
  '中文：困难的',
  'difficult problem',
  '中文：难题',
  'This test is difficult.',
  '中文：这个测试很难。',
  23,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000024',
  '25000000-0000-0000-0000-000000000001',
  'essential',
  '/ɪˈsenʃl/',
  'adjective',
  'Absolutely necessary',
  '中文：必不可少的',
  'essential skill',
  '中文：基本技能',
  'Water is essential for life.',
  '中文：水对生命是必不可少的。',
  24,
  4,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000025',
  '25000000-0000-0000-0000-000000000001',
  'famous',
  '/ˈfeɪməs/',
  'adjective',
  'Known about by many people',
  '中文：著名的',
  'famous person',
  '中文：名人',
  'He is a famous writer.',
  '中文：他是一位著名的作家。',
  25,
  2,
  NOW()
),
-- 第6批：5个副词
(
  '30000000-0000-0000-0000-000000000026',
  '25000000-0000-0000-0000-000000000001',
  'actually',
  '/ˈæktʃuəli/',
  'adverb',
  'Used to emphasize the truth',
  '中文：实际上',
  'actually true',
  '中文：实际上是真的',
  'Actually, I agree with you.',
  '中文：实际上，我同意你的观点。',
  26,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000027',
  '25000000-0000-0000-0000-000000000001',
  'carefully',
  '/ˈkeəfəli/',
  'adverb',
  'With great attention',
  '中文：仔细地，小心地',
  'drive carefully',
  '中文：小心驾驶',
  'Listen carefully.',
  '中文：仔细听。',
  27,
  2,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000028',
  '25000000-0000-0000-0000-000000000001',
  'especially',
  '/ɪˈspeʃəli/',
  'adverb',
  'Used to single out one person or thing',
  '中文：尤其，特别',
  'especially like',
  '中文：特别喜欢',
  'I love fruits, especially apples.',
  '中文：我喜欢水果，尤其是苹果。',
  28,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000029',
  '25000000-0000-0000-0000-000000000001',
  'finally',
  '/ˈfaɪnəli/',
  'adverb',
  'At the end of a process',
  '中文：最后，终于',
  'finally succeed',
  '中文：终于成功',
  'We finally arrived.',
  '中文：我们终于到达了。',
  29,
  2,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000030',
  '25000000-0000-0000-0000-000000000001',
  'generally',
  '/ˈdʒenrəli/',
  'adverb',
  'Usually or in most cases',
  '中文：通常，一般',
  'generally speaking',
  '中文：一般来说',
  'Generally, I agree.',
  '中文：一般来说，我同意。',
  30,
  3,
  NOW()
),
-- 第7批：5个介词
(
  '30000000-0000-0000-0000-000000000031',
  '25000000-0000-0000-0000-000000000001',
  'above',
  '/əˈbʌv/',
  'preposition',
  'At a higher level',
  '中文：在...之上',
  'above the table',
  '中文：在桌子上方',
  'The bird flew above the trees.',
  '中文：鸟在树上方飞。',
  31,
  1,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000032',
  '25000000-0000-0000-0000-000000000001',
  'beside',
  '/bɪˈsaɪd/',
  'preposition',
  'Next to',
  '中文：在...旁边',
  'beside the river',
  '中文：在河边',
  'He sat beside me.',
  '中文：他坐在我旁边。',
  32,
  2,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000033',
  '25000000-0000-0000-0000-000000000001',
  'during',
  '/ˈdjʊərɪŋ/',
  'preposition',
  'Throughout the course of',
  '中文：在...期间',
  'during the meeting',
  '中文：在会议期间',
  'No talking during class.',
  '中文：上课期间不要说话。',
  33,
  2,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000034',
  '25000000-0000-0000-0000-000000000001',
  'except',
  '/ɪkˈsept/',
  'preposition',
  'Not including',
  '中文：除了',
  'except for',
  '中文：除了',
  'Everyone came except Tom.',
  '中文：除了汤姆，大家都来了。',
  34,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000035',
  '25000000-0000-0000-0000-000000000001',
  'towards',
  '/təˈwɔːdz/',
  'preposition',
  'In the direction of',
  '中文：朝向',
  'walk towards',
  '中文：朝...走',
  'He walked towards the door.',
  '中文：他朝门口走去。',
  35,
  2,
  NOW()
),
-- 第8批：5个教育相关词汇
(
  '30000000-0000-0000-0000-000000000036',
  '25000000-0000-0000-0000-000000000001',
  'academic',
  '/ˌækəˈdemɪk/',
  'adjective',
  'Relating to education and scholarship',
  '中文：学术的',
  'academic achievement',
  '中文：学术成就',
  'She has excellent academic performance.',
  '中文：她学业表现优异。',
  36,
  4,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000037',
  '25000000-0000-0000-0000-000000000001',
  'assignment',
  '/əˈsaɪnmənt/',
  'noun',
  'A task or piece of work assigned',
  '中文：作业，任务',
  'homework assignment',
  '中文：家庭作业',
  'I finished my assignment.',
  '中文：我完成了作业。',
  37,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000038',
  '25000000-0000-0000-0000-000000000001',
  'classroom',
  '/ˈklɑːsruːm/',
  'noun',
  'A room where classes are taught',
  '中文：教室',
  'classroom setting',
  '中文：课堂环境',
  'The classroom is quiet.',
  '中文：教室很安静。',
  38,
  1,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000039',
  '25000000-0000-0000-0000-000000000001',
  'degree',
  '/dɪˈɡriː/',
  'noun',
  'An academic rank',
  '中文：学位',
  'bachelor degree',
  '中文：学士学位',
  'She earned her degree last year.',
  '中文：她去年获得了学位。',
  39,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000040',
  '25000000-0000-0000-0000-000000000001',
  'examination',
  '/ɪɡˌzæmɪˈneɪʃn/',
  'noun',
  'A formal test',
  '中文：考试',
  'pass examination',
  '中文：通过考试',
  'The examination is difficult.',
  '中文：考试很难。',
  40,
  4,
  NOW()
),
-- 第9批：5个科技相关词汇
(
  '30000000-0000-0000-0000-000000000041',
  '25000000-0000-0000-0000-000000000001',
  'algorithm',
  '/ˈælɡərɪðəm/',
  'noun',
  'A process or set of rules',
  '中文：算法',
  'search algorithm',
  '中文：搜索算法',
  'This algorithm is efficient.',
  '中文：这个算法很高效。',
  41,
  5,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000042',
  '25000000-0000-0000-0000-000000000001',
  'browser',
  '/ˈbraʊzər/',
  'noun',
  'A program for accessing the internet',
  '中文：浏览器',
  'web browser',
  '中文：网页浏览器',
  'Which browser do you use?',
  '中文：你用哪个浏览器？',
  42,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000043',
  '25000000-0000-0000-0000-000000000001',
  'database',
  '/ˈdeɪtəbeɪs/',
  'noun',
  'An organized collection of data',
  '中文：数据库',
  'store in database',
  '中文：存储到数据库',
  'The database is large.',
  '中文：数据库很大。',
  43,
  4,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000044',
  '25000000-0000-0000-0000-000000000001',
  'electronic',
  '/ɪˌlekˈtrɒnɪk/',
  'adjective',
  'Related to electrons and devices',
  '中文：电子的',
  'electronic device',
  '中文：电子设备',
  'I like electronic music.',
  '中文：我喜欢电子音乐。',
  44,
  4,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000045',
  '25000000-0000-0000-0000-000000000001',
  'interface',
  '/ˈɪntərfeɪs/',
  'noun',
  'A point where systems meet',
  '中文：接口，界面',
  'user interface',
  '中文：用户界面',
  'The interface is user-friendly.',
  '中文：这个界面很友好。',
  45,
  5,
  NOW()
),
-- 第10批：5个商务相关词汇
(
  '30000000-0000-0000-0000-000000000046',
  '25000000-0000-0000-0000-000000000001',
  'achievement',
  '/əˈtʃiːvmənt/',
  'noun',
  'Something accomplished successfully',
  '中文：成就',
  'great achievement',
  '中文：伟大成就',
  'His achievement is remarkable.',
  '中文：他的成就非凡。',
  46,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000047',
  '25000000-0000-0000-0000-000000000001',
  'budget',
  '/ˈbʌdʒɪt/',
  'noun',
  'An estimate of income and expenditure',
  '中文：预算',
  'monthly budget',
  '中文：月度预算',
  'We need a budget plan.',
  '中文：我们需要预算计划。',
  47,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000048',
  '25000000-0000-0000-0000-000000000001',
  'competition',
  '/ˌkɒmpəˈtɪʃn/',
  'noun',
  'The activity of competing',
  '中文：竞争',
  'fierce competition',
  '中文：激烈竞争',
  'The competition is tough.',
  '中文：竞争很激烈。',
  48,
  4,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000049',
  '25000000-0000-0000-0000-000000000001',
  'customer',
  '/ˈkʌstəmər/',
  'noun',
  'A person who buys goods',
  '中文：顾客',
  'customer service',
  '中文：客户服务',
  'The customer is satisfied.',
  '中文：客户很满意。',
  49,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000050',
  '25000000-0000-0000-0000-000000000001',
  'employee',
  '/ɪmˈplɔɪiː/',
  'noun',
  'A person employed for wages',
  '中文：员工',
  'full-time employee',
  '中文：全职员工',
  'Every employee works hard.',
  '中文：每个员工都很努力。',
  50,
  3,
  NOW()
),
-- 第11批：5个健康相关词汇
(
  '30000000-0000-0000-0000-000000000051',
  '25000000-0000-0000-0000-000000000001',
  'energy',
  '/ˈenərdʒi/',
  'noun',
  'The strength and vitality required for sustained activity',
  '中文：能量，精力',
  'renewable energy',
  '中文：可再生能源',
  'I have no energy today.',
  '中文：我今天没精力。',
  51,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000052',
  '25000000-0000-0000-0000-000000000001',
  'fitness',
  '/ˈfɪtnəs/',
  'noun',
  'The condition of being physically fit',
  '中文：健康，健身',
  'physical fitness',
  '中文：身体健康',
  'Fitness is important.',
  '中文：健身很重要。',
  52,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000053',
  '25000000-0000-0000-0000-000000000001',
  'hospital',
  '/ˈhɒspɪtl/',
  'noun',
  'An institution providing medical treatment',
  '中文：医院',
  'go to hospital',
  '中文：去医院',
  'She works in a hospital.',
  '中文：她在医院工作。',
  53,
  2,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000054',
  '25000000-0000-0000-0000-000000000001',
  'injury',
  '/ˈɪndʒəri/',
  'noun',
  'An instance of being injured',
  '中文：伤害，受伤',
  'serious injury',
  '中文：严重受伤',
  'He recovered from his injury.',
  '中文：他从伤病中恢复。',
  54,
  3,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000055',
  '25000000-0000-0000-0000-000000000001',
  'medicine',
  '/ˈmedsn/',
  'noun',
  'The science or practice of medicine',
  '中文：医学，药物',
  'take medicine',
  '中文：吃药',
  'Take your medicine.',
  '中文：吃你的药。',
  55,
  3,
  NOW()
),
-- 第12批：5个自然相关词汇
(
  '30000000-0000-0000-0000-000000000056',
  '25000000-0000-0000-0000-000000000001',
  'atmosphere',
  '/ˈætməsfɪər/',
  'noun',
  'The envelope of gases surrounding the earth',
  '中文：大气，气氛',
  'atmospheric pressure',
  '中文：大气压',
  'The atmosphere is polluted.',
  '中文：大气被污染了。',
  56,
  5,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000057',
  '25000000-0000-0000-0000-000000000001',
  'climate',
  '/ˈklaɪmət/',
  'noun',
  'The weather conditions prevailing in an area',
  '中文：气候',
  'climate change',
  '中文：气候变化',
  'The climate is changing.',
  '中文：气候正在变化。',
  57,
  4,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000058',
  '25000000-0000-0000-0000-000000000001',
  'environment',
  '/ɪnˈvaɪrənmənt/',
  'noun',
  'The surroundings or conditions in which one lives',
  '中文：环境',
  'protect environment',
  '中文：保护环境',
  'We must protect the environment.',
  '中文：我们必须保护环境。',
  58,
  4,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000059',
  '25000000-0000-0000-0000-000000000001',
  'forest',
  '/ˈfɒrɪst/',
  'noun',
  'A large area covered chiefly with trees',
  '中文：森林',
  'rainforest',
  '中文：雨林',
  'The forest is beautiful.',
  '中文：森林很美。',
  59,
  2,
  NOW()
),
(
  '30000000-0000-0000-0000-000000000060',
  '25000000-0000-0000-0000-000000000001',
  'ocean',
  '/ˈəʊʃn/',
  'noun',
  'A very large expanse of sea',
  '中文：海洋',
  'ocean life',
  '中文：海洋生物',
  'The ocean is deep.',
  '中文：海洋很深。',
  60,
  2,
  NOW()
),
-- 从这里开始批量添加剩余140个单词（61-200）
-- 第13批：常用动词 (61-70)
(
  '30000000-0000-0000-0000-000000000061', '25000000-0000-0000-0000-000000000001', 'analyze', '/ˈænəlaɪz/', 'verb', 'Examine methodically', '中文：分析', 'analyze data', '中文：分析数据', 'We need to analyze the problem.', '中文：我们需要分析这个问题。', 61, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000062', '25000000-0000-0000-0000-000000000001', 'approach', '/əˈprəʊtʃ/', 'verb', 'Come near or nearer to', '中文：接近，方法', 'approach carefully', '中文：小心接近', 'Winter is approaching.', '中文：冬天快到了。', 62, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000063', '25000000-0000-0000-0000-000000000001', 'arrange', '/əˈreɪndʒ/', 'verb', 'Put in order', '中文：安排', 'arrange meeting', '中文：安排会议', 'Please arrange the room.', '中文：请整理房间。', 63, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000064', '25000000-0000-0000-0000-000000000001', 'connect', '/kəˈnekt/', 'verb', 'Join together', '中文：连接', 'connect to internet', '中文：连接网络', 'Connect the devices.', '中文：连接这些设备。', 64, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000065', '25000000-0000-0000-0000-000000000001', 'decide', '/dɪˈsaɪd/', 'verb', 'Make a choice', '中文：决定', 'decide to do', '中文：决定做', 'I decided to learn English.', '中文：我决定学英语。', 65, 2, NOW()
),
(
  '30000000-0000-0000-0000-000000000066', '25000000-0000-0000-0000-000000000001', 'describe', '/dɪˈskraɪb/', 'verb', 'Give a detailed account', '中文：描述', 'describe the picture', '中文：描述图片', 'Can you describe it?', '中文：你能描述一下吗？', 66, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000067', '25000000-0000-0000-0000-000000000001', 'encourage', '/ɪnˈkʌrɪdʒ/', 'verb', 'Give support and confidence', '中文：鼓励', 'encourage someone', '中文：鼓励某人', 'He encouraged me.', '中文：他鼓励了我。', 67, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000068', '25000000-0000-0000-0000-000000000001', 'follow', '/ˈfɒləʊ/', 'verb', 'Go or come after', '中文：跟随', 'follow instructions', '中文：遵循说明', 'Follow me.', '中文：跟我来。', 68, 2, NOW()
),
(
  '30000000-0000-0000-0000-000000000069', '25000000-0000-0000-0000-000000000001', 'imagine', '/ɪˈmædʒɪn/', 'verb', 'Form a mental image', '中文：想象', 'imagine that', '中文：想象一下', 'Imagine the future.', '中文：想象未来。', 69, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000070', '25000000-0000-0000-0000-000000000001', 'indicate', '/ˈɪndɪkeɪt/', 'verb', 'Point out or show', '中文：指出，表明', 'indicate the direction', '中文：指出方向', 'The data indicates success.', '中文：数据表明成功。', 70, 4, NOW()
),
-- 第14批：更多名词 (71-80)
(
  '30000000-0000-0000-0000-000000000071', '25000000-0000-0000-0000-000000000001', 'journal', '/ˈdʒɜːnl/', 'noun', 'A daily record', '中文：日记，期刊', 'keep a journal', '中文：写日记', 'I write in my journal.', '中文：我写日记。', 71, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000072', '25000000-0000-0000-0000-000000000001', 'journey', '/ˈdʒɜːni/', 'noun', 'An act of traveling', '中文：旅程', 'long journey', '中文：长途旅行', 'Life is a journey.', '中文：生活是一场旅程。', 72, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000073', '25000000-0000-0000-0000-000000000001', 'literature', '/ˈlɪtrətʃər/', 'noun', 'Written works', '中文：文学', 'study literature', '中文：学习文学', 'I love literature.', '中文：我热爱文学。', 73, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000074', '25000000-0000-0000-0000-000000000001', 'material', '/məˈtɪəriəl/', 'noun', 'The matter from which something is made', '中文：材料', 'building material', '中文：建筑材料', 'This material is strong.', '中文：这个材料很结实。', 74, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000075', '25000000-0000-0000-0000-000000000001', 'method', '/ˈmeθəd/', 'noun', 'A particular way of doing something', '中文：方法', 'scientific method', '中文：科学方法', 'This method works.', '中文：这个方法有效。', 75, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000076', '25000000-0000-0000-0000-000000000001', 'nation', '/ˈneɪʃn/', 'noun', 'A large body of people united by common descent', '中文：国家，民族', 'independent nation', '中文：独立国家', 'Our nation is strong.', '中文：我们的国家很强大。', 76, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000077', '25000000-0000-0000-0000-000000000001', 'opinion', '/əˈpɪnjən/', 'noun', 'A view or judgment formed', '中文：意见', 'in my opinion', '中文：在我看来', 'What is your opinion?', '中文：你有什么意见？', 77, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000078', '25000000-0000-0000-0000-000000000001', 'pattern', '/ˈpætn/', 'noun', 'A repeated design', '中文：模式，图案', 'follow a pattern', '中文：遵循模式', 'I see a pattern.', '中文：我看到了一个模式。', 78, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000079', '25000000-0000-0000-0000-000000000001', 'position', '/pəˈzɪʃn/', 'noun', 'A place where someone or something is located', '中文：位置，职位', 'apply for position', '中文：申请职位', 'What is your position?', '中文：你的立场是什么？', 79, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000080', '25000000-0000-0000-0000-000000000001', 'quality', '/ˈkwɒləti/', 'noun', 'The standard of something', '中文：质量', 'high quality', '中文：高质量', 'Quality matters.', '中文：质量很重要。', 80, 3, NOW()
),
-- 第15批：形容词 (81-90)
(
  '30000000-0000-0000-0000-000000000081', '25000000-0000-0000-0000-000000000001', 'accurate', '/ˈækjərət/', 'adjective', 'Correct in all details', '中文：准确的', 'accurate information', '中文：准确的信息', 'Is this accurate?', '中文：这准确吗？', 81, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000082', '25000000-0000-0000-0000-000000000001', 'aware', '/əˈweər/', 'adjective', 'Having knowledge or perception', '中文：意识到的', 'become aware', '中文：意识到', 'I am aware of the problem.', '中文：我意识到了这个问题。', 82, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000083', '25000000-0000-0000-0000-000000000001', 'brilliant', '/ˈbrɪliənt/', 'adjective', 'Exceptionally clever or talented', '中文： brilliant，杰出的', 'brilliant idea', '中文：绝妙的主意', 'That is brilliant!', '中文：那太棒了！', 83, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000084', '25000000-0000-0000-0000-000000000001', 'capable', '/ˈkeɪpəbl/', 'adjective', 'Having the ability', '中文：有能力的', 'capable person', '中文：能干的人', 'She is very capable.', '中文：她很能干。', 84, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000085', '25000000-0000-0000-0000-000000000001', 'comfortable', '/ˈkʌmftəbl/', 'adjective', 'Providing comfort', '中文：舒适的', 'comfortable life', '中文：舒适的生活', 'I feel comfortable.', '中文：我感觉很舒适。', 85, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000086', '25000000-0000-0000-0000-000000000001', 'dangerous', '/ˈdeɪndʒərəs/', 'adjective', 'Involving danger', '中文：危险的', 'dangerous situation', '中文：危险的情况', 'This is dangerous.', '中文：这很危险。', 86, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000087', '25000000-0000-0000-0000-000000000001', 'effective', '/ɪˈfektɪv/', 'adjective', 'Successful in producing a result', '中文：有效的', 'effective method', '中文：有效的方法', 'This is effective.', '中文：这很有效。', 87, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000088', '25000000-0000-0000-0000-000000000001', 'efficient', '/ɪˈfɪʃnt/', 'adjective', 'Working well', '中文：高效的', 'efficient system', '中文：高效的系统', 'Be more efficient.', '中文：要更高效。', 88, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000089', '25000000-0000-0000-0000-000000000001', 'flexible', '/ˈfleksəbl/', 'adjective', 'Easily modified', '中文：灵活的', 'flexible schedule', '中文：灵活的时间表', 'We are flexible.', '中文：我们很灵活。', 89, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000090', '25000000-0000-0000-0000-000000000001', 'generous', '/ˈdʒenərəs/', 'adjective', 'Showing kindness', '中文：慷慨的', 'generous offer', '中文：慷慨的提议', 'He is generous.', '中文：他很慷慨。', 90, 4, NOW()
),
-- 第16批：更多动词 (91-100)
(
  '30000000-0000-0000-0000-000000000091', '25000000-0000-0000-0000-000000000001', 'invest', '/ɪnˈvest/', 'verb', 'Put money into', '中文：投资', 'invest money', '中文：投资金钱', 'Invest in your future.', '中文：投资你的未来。', 91, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000092', '25000000-0000-0000-0000-000000000001', 'maintain', '/meɪnˈteɪn/', 'verb', 'Cause to continue', '中文：维持', 'maintain order', '中文：维持秩序', 'Maintain your health.', '中文：保持健康。', 92, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000093', '25000000-0000-0000-0000-000000000001', 'negotiate', '/nɪˈɡəʊʃieɪt/', 'verb', 'Try to reach an agreement', '中文：谈判', 'negotiate a deal', '中文：谈判交易', 'Let us negotiate.', '中文：让我们谈判吧。', 93, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000094', '25000000-0000-0000-0000-000000000001', 'observe', '/əbˈzɜːv/', 'verb', 'Notice or perceive', '中文：观察', 'observe carefully', '中文：仔细观察', 'Observe the rules.', '中文：遵守规则。', 94, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000095', '25000000-0000-0000-0000-000000000001', 'participate', '/pɑːˈtɪsɪpeɪt/', 'verb', 'Take part in', '中文：参与', 'participate in', '中文：参与', 'Please participate.', '中文：请参与。', 95, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000096', '25000000-0000-0000-0000-000000000001', 'predict', '/prɪˈdɪkt/', 'verb', 'Estimate or say in advance', '中文：预测', 'predict the outcome', '中文：预测结果', 'Can you predict it?', '中文：你能预测吗？', 96, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000097', '25000000-0000-0000-0000-000000000001', 'provide', '/prəˈvaɪd/', 'verb', 'Make available', '中文：提供', 'provide service', '中文：提供服务', 'We provide quality.', '中文：我们提供质量。', 97, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000098', '25000000-0000-0000-0000-000000000001', 'realize', '/ˈriːəlaɪz/', 'verb', 'Become fully aware', '中文：实现，意识到', 'realize a dream', '中文：实现梦想', 'I realized my mistake.', '中文：我意识到了我的错误。', 98, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000099', '25000000-0000-0000-0000-000000000001', 'recommend', '/ˌrekəˈmend/', 'verb', 'Advise or suggest', '中文：推荐', 'recommend a book', '中文：推荐一本书', 'I recommend this.', '中文：我推荐这个。', 99, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000100', '25000000-0000-0000-0000-000000000001', 'solve', '/sɒlv/', 'verb', 'Find an answer to', '中文：解决', 'solve a problem', '中文：解决问题', 'Let us solve it.', '中文：让我们来解决它。', 100, 2, NOW()
),
-- 第17批：名词 (101-110)
(
  '30000000-0000-0000-0000-000000000101', '25000000-0000-0000-0000-000000000001', 'reference', '/ˈrefrəns/', 'noun', 'The act of referring', '中文：参考', 'for reference', '中文：供参考', 'Keep this for reference.', '中文：保留这个供参考。', 101, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000102', '25000000-0000-0000-0000-000000000001', 'requirement', '/rɪˈkwaɪərmənt/', 'noun', 'A thing that is needed', '中文：要求', 'meet requirement', '中文：满足要求', 'This is a requirement.', '中文：这是一个要求。', 102, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000103', '25000000-0000-0000-0000-000000000001', 'resource', '/rɪˈsɔːs/', 'noun', 'A stock or supply of assets', '中文：资源', 'natural resource', '中文：自然资源', 'Conserve resources.', '中文：节约资源。', 103, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000104', '25000000-0000-0000-0000-000000000001', 'responsibility', '/rɪˌspɒnsəˈbɪləti/', 'noun', 'The state of being responsible', '中文：责任', 'take responsibility', '中文：承担责任', 'It is my responsibility.', '中文：这是我的责任。', 104, 5, NOW()
),
(
  '30000000-0000-0000-0000-000000000105', '25000000-0000-0000-0000-000000000001', 'revenue', '/ˈrevənjuː/', 'noun', 'Income generated', '中文：收入', 'annual revenue', '中文：年收入', 'Revenue increased.', '中文：收入增加了。', 105, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000106', '25000000-0000-0000-0000-000000000001', 'strategy', '/ˈstrætədʒi/', 'noun', 'A plan of action', '中文：策略', 'business strategy', '中文：商业策略', 'We need a strategy.', '中文：我们需要一个策略。', 106, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000107', '25000000-0000-0000-0000-000000000001', 'strength', '/streŋθ/', 'noun', 'The quality of being strong', '中文：力量，优势', 'physical strength', '中文：体力', 'Know your strength.', '中文：了解你的优势。', 107, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000108', '25000000-0000-0000-0000-000000000001', 'solution', '/səˈluːʃn/', 'noun', 'A means of solving a problem', '中文：解决方案', 'find a solution', '中文：找到解决方案', 'What is the solution?', '中文：解决方案是什么？', 108, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000109', '25000000-0000-0000-0000-000000000001', 'tradition', '/trəˈdɪʃn/', 'noun', 'A long-established custom', '中文：传统', 'cultural tradition', '中文：文化传统', 'Respect tradition.', '中文：尊重传统。', 109, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000110', '25000000-0000-0000-0000-000000000001', 'variation', '/ˌveəriˈeɪʃn/', 'noun', 'A change or difference', '中文：变化', 'temperature variation', '中文：温度变化', 'There is much variation.', '中文：有很多变化。', 110, 4, NOW()
),
-- 第18批：形容词 (111-120)
(
  '30000000-0000-0000-0000-000000000111', '25000000-0000-0000-0000-000000000001', 'huge', '/hjuːdʒ/', 'adjective', 'Extremely large', '中文：巨大的', 'huge success', '中文：巨大的成功', 'That is huge!', '中文：那太大了！', 111, 2, NOW()
),
(
  '30000000-0000-0000-0000-000000000112', '25000000-0000-0000-0000-000000000001', 'ideal', '/aɪˈdiːəl/', 'adjective', 'Satisfying one''s conception', '中文：理想的', 'ideal condition', '中文：理想条件', 'This is ideal.', '中文：这很理想。', 112, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000113', '25000000-0000-0000-0000-000000000001', 'logical', '/ˈlɒdʒɪkl/', 'adjective', 'Characterized by clear reasoning', '中文：合逻辑的', 'logical thinking', '中文：逻辑思维', 'Be logical.', '中文：要合逻辑。', 113, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000114', '25000000-0000-0000-0000-000000000001', 'mental', '/ˈmentl/', 'adjective', 'Relating to the mind', '中文：精神的，脑力的', 'mental health', '中文：心理健康', 'Mental exercise is important.', '中文：脑力锻炼很重要。', 114, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000115', '25000000-0000-0000-0000-000000000001', 'negative', '/ˈneɡətɪv/', 'adjective', 'Consisting in denial', '中文：消极的，负面的', 'negative impact', '中文：负面影响', 'Do not be negative.', '中文：不要消极。', 115, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000116', '25000000-0000-0000-0000-000000000001', 'optimistic', '/ˌɒptɪˈmɪstɪk/', 'adjective', 'Hopeful and confident', '中文：乐观的', 'optimistic view', '中文：乐观的看法', 'I am optimistic.', '中文：我很乐观。', 116, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000117', '25000000-0000-0000-0000-000000000001', 'potential', '/pəˈtenʃl/', 'adjective', 'Having or showing the capacity', '中文：潜在的', 'potential risk', '中文：潜在风险', 'Be aware of potential.', '中文：意识到潜在性。', 117, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000118', '25000000-0000-0000-0000-000000000001', 'proper', '/ˈprɒpər/', 'adjective', 'Truly what is said', '中文：适当的', 'proper way', '中文：适当的方式', 'Use proper method.', '中文：使用正确的方法。', 118, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000119', '25000000-0000-0000-0000-000000000001', 'relevant', '/ˈreləvənt/', 'adjective', 'Closely connected or appropriate', '中文：相关的', 'relevant information', '中文：相关信息', 'This is relevant.', '中文：这是相关的。', 119, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000120', '25000000-0000-0000-0000-000000000001', 'similar', '/ˈsɪmələr/', 'adjective', 'Resembling without being identical', '中文：相似的', 'similar situation', '中文：相似的情况', 'They are similar.', '中文：它们很相似。', 120, 3, NOW()
),
-- 第19批：动词 (121-130)
(
  '30000000-0000-0000-0000-000000000121', '25000000-0000-0000-0000-000000000001', 'adapt', '/əˈdæpt/', 'verb', 'Make suitable for a new use', '中文：适应', 'adapt to change', '中文：适应变化', 'We must adapt.', '中文：我们必须适应。', 121, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000122', '25000000-0000-0000-0000-000000000001', 'communicate', '/kəˈmjuːnɪkeɪt/', 'verb', 'Exchange information', '中文：交流', 'communicate well', '中文：好好交流', 'Communicate your ideas.', '中文：交流你的想法。', 122, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000123', '25000000-0000-0000-0000-000000000001', 'concentrate', '/ˈkɒnsntreɪt/', 'verb', 'Focus one''s attention', '中文：集中', 'concentrate on', '中文：专注于', 'Concentrate on your work.', '中文：专注于你的工作。', 123, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000124', '25000000-0000-0000-0000-000000000001', 'demonstrate', '/ˈdemənstreɪt/', 'verb', 'Show by example', '中文：展示，证明', 'demonstrate ability', '中文：展示能力', 'Demonstrate your skill.', '中文：展示你的技能。', 124, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000125', '25000000-0000-0000-0000-000000000001', 'emphasize', '/ˈemfəsaɪz/', 'verb', 'Give special importance', '中文：强调', 'emphasize the point', '中文：强调这一点', 'I emphasize quality.', '中文：我强调质量。', 125, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000126', '25000000-0000-0000-0000-000000000001', 'guarantee', '/ˌɡærənˈtiː/', 'verb', 'Provide a formal assurance', '中文：保证', 'guarantee quality', '中文：保证质量', 'We guarantee satisfaction.', '中文：我们保证满意。', 126, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000127', '25000000-0000-0000-0000-000000000001', 'illustrate', '/ˈɪləstreɪt/', 'verb', 'Explain or make clear', '中文：说明，图解', 'illustrate with examples', '中文：用例子说明', 'Let me illustrate.', '中文：让我说明一下。', 127, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000128', '25000000-0000-0000-0000-000000000001', 'motivate', '/ˈməʊtɪveɪt/', 'verb', 'Provide someone with a motive', '中文：激励', 'motivate others', '中文：激励他人', 'Motivate yourself.', '中文：激励自己。', 128, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000129', '25000000-0000-0000-0000-000000000001', 'produce', '/prəˈdjuːs/', 'verb', 'Make or manufacture', '中文：生产', 'produce goods', '中文：生产商品', 'Factories produce cars.', '中文：工厂生产汽车。', 129, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000130', '25000000-0000-0000-0000-000000000001', 'promote', '/prəˈməʊt/', 'verb', 'Further the progress of something', '中文：促进，推广', 'promote sales', '中文：促进销售', 'Promote health.', '中文：促进健康。', 130, 3, NOW()
),
-- 第20批：名词 (131-140)
(
  '30000000-0000-0000-0000-000000000131', '25000000-0000-0000-0000-000000000001', 'agency', '/ˈeɪdʒənsi/', 'noun', 'A business or organization', '中文：代理机构', 'travel agency', '中文：旅行社', 'Contact the agency.', '中文：联系代理商。', 131, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000132', '25000000-0000-0000-0000-000000000001', 'architecture', '/ˈɑːkɪtektʃər/', 'noun', 'The art or practice of designing', '中文：建筑学', 'modern architecture', '中文：现代建筑', 'I love architecture.', '中文：我热爱建筑学。', 132, 5, NOW()
),
(
  '30000000-0000-0000-0000-000000000133', '25000000-0000-0000-0000-000000000001', 'aspect', '/ˈæspekt/', 'noun', 'A particular part or feature', '中文：方面', 'important aspect', '中文：重要方面', 'Consider every aspect.', '中文：考虑每个方面。', 133, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000134', '25000000-0000-0000-0000-000000000001', 'attitude', '/ˈætɪtjuːd/', 'noun', 'A settled way of thinking or feeling', '中文：态度', 'positive attitude', '中文：积极态度', 'Keep a good attitude.', '中文：保持良好态度。', 134, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000135', '25000000-0000-0000-0000-000000000001', 'category', '/ˈkætəɡəri/', 'noun', 'A class or division', '中文：类别', 'product category', '中文：产品类别', 'Which category?', '中文：哪个类别？', 135, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000136', '25000000-0000-0000-0000-000000000001', 'context', '/ˈkɒntekst/', 'noun', 'The circumstances that form the setting', '中文：上下文，背景', 'in context', '中文：在上下文中', 'Consider the context.', '中文：考虑背景。', 136, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000137', '25000000-0000-0000-0000-000000000001', 'culture', '/ˈkʌltʃər/', 'noun', 'The customs and civilization', '中文：文化', 'cultural heritage', '中文：文化遗产', 'Learn about culture.', '中文：了解文化。', 137, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000138', '25000000-0000-0000-0000-000000000001', 'destination', '/ˌdestɪˈneɪʃn/', 'noun', 'The place to which someone is going', '中文：目的地', 'travel destination', '中文：旅游目的地', 'What is your destination?', '中文：你的目的地是哪？', 138, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000139', '25000000-0000-0000-0000-000000000001', 'dimension', '/daɪˈmenʃn/', 'noun', 'A measurable extent', '中文：维度，尺寸', 'add dimension', '中文：增加维度', 'This has two dimensions.', '中文：这是二维的。', 139, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000140', '25000000-0000-0000-0000-000000000001', 'element', '/ˈelɪmənt/', 'noun', 'A part or aspect of something abstract', '中文：元素', 'essential element', '中文：基本元素', 'This is a key element.', '中文：这是一个关键元素。', 140, 3, NOW()
),
-- 第21批：形容词 (141-150)
(
  '30000000-0000-0000-0000-000000000141', '25000000-0000-0000-0000-000000000001', 'automatic', '/ˌɔːtəˈmætɪk/', 'adjective', 'Operating by itself', '中文：自动的', 'automatic door', '中文：自动门', 'It is automatic.', '中文：这是自动的。', 141, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000142', '25000000-0000-0000-0000-000000000001', 'beneficial', '/ˌbenɪˈfɪʃl/', 'adjective', 'Favorable or advantageous', '中文：有益的', 'beneficial effect', '中文：有益效果', 'Exercise is beneficial.', '中文：运动是有益的。', 142, 5, NOW()
),
(
  '30000000-0000-0000-0000-000000000143', '25000000-0000-0000-0000-000000000001', 'chemical', '/ˈkemɪkl/', 'adjective', 'Relating to chemistry', '中文：化学的', 'chemical reaction', '中文：化学反应', 'This is chemical.', '中文：这是化学的。', 143, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000144', '25000000-0000-0000-0000-000000000001', 'critical', '/ˈkrɪtɪkl/', 'adjective', 'Expressing adverse or disapproving comments', '中文：关键的，批评的', 'critical thinking', '中文：批判性思维', 'This is critical.', '中文：这是关键的。', 144, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000145', '25000000-0000-0000-0000-000000000001', 'diverse', '/daɪˈvɜːs/', 'adjective', 'Showing a great deal of variety', '中文：多样的', 'diverse culture', '中文：多元文化', 'Our team is diverse.', '中文：我们的团队很多样化。', 145, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000146', '25000000-0000-0000-0000-000000000001', 'electrical', '/ɪˈlektrɪkl/', 'adjective', 'Relating to electricity', '中文：电的', 'electrical device', '中文：电子设备', 'This is electrical.', '中文：这是电的。', 146, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000147', '25000000-0000-0000-0000-000000000001', 'global', '/ˈɡləʊbl/', 'adjective', 'Relating to the whole world', '中文：全球的', 'global economy', '中文：全球经济', 'This is a global issue.', '中文：这是一个全球性问题。', 147, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000148', '25000000-0000-0000-0000-000000000001', 'historical', '/hɪˈstɒrɪkl/', 'adjective', 'Relating to history', '中文：历史的', 'historical event', '中文：历史事件', 'This is historical.', '中文：这是历史的。', 148, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000149', '25000000-0000-0000-0000-000000000001', 'intelligent', '/ɪnˈtelɪdʒənt/', 'adjective', 'Having or showing intelligence', '中文：聪明的', 'intelligent person', '中文：聪明人', 'She is intelligent.', '中文：她很聪明。', 149, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000150', '25000000-0000-0000-0000-000000000001', 'magnetic', '/mæɡˈnetɪk/', 'adjective', 'Having the properties of a magnet', '中文：有磁性的', 'magnetic field', '中文：磁场', 'This is magnetic.', '中文：这是有磁性的。', 150, 4, NOW()
),
-- 第22批：动词 (151-160)
(
  '30000000-0000-0000-0000-000000000151', '25000000-0000-0000-0000-000000000001', 'assess', '/əˈses/', 'verb', 'Evaluate or estimate', '中文：评估', 'assess the situation', '中文：评估情况', 'Let me assess.', '中文：让我评估一下。', 151, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000152', '25000000-0000-0000-0000-000000000001', 'calculate', '/ˈkælkjuleɪt/', 'verb', 'Determine mathematically', '中文：计算', 'calculate the cost', '中文：计算成本', 'Calculate carefully.', '中文：仔细计算。', 152, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000153', '25000000-0000-0000-0000-000000000001', 'classify', '/ˈklæsɪfaɪ/', 'verb', 'Arrange in a class', '中文：分类', 'classify information', '中文：信息分类', 'Classify the items.', '中文：分类这些物品。', 153, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000154', '25000000-0000-0000-0000-000000000001', 'combine', '/kəmˈbaɪn/', 'verb', 'Join or mix together', '中文：结合', 'combine efforts', '中文：共同努力', 'Combine the ingredients.', '中文：混合这些配料。', 154, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000155', '25000000-0000-0000-0000-000000000001', 'distinguish', '/dɪˈstɪŋɡwɪʃ/', 'verb', 'Recognize or treat as different', '中文：区分', 'distinguish between', '中文：区分', 'Can you distinguish them?', '中文：你能区分它们吗？', 155, 5, NOW()
),
(
  '30000000-0000-0000-0000-000000000156', '25000000-0000-0000-0000-000000000001', 'establish', '/ɪˈstæblɪʃ/', 'verb', 'Set up on a firm or permanent basis', '中文：建立', 'establish relationship', '中文：建立关系', 'Establish a business.', '中文：建立业务。', 156, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000157', '25000000-0000-0000-0000-000000000001', 'evaluate', '/ɪˈvæljueɪt/', 'verb', 'Form an idea of the amount or value', '中文：评价', 'evaluate performance', '中文：评价表现', 'We need to evaluate.', '中文：我们需要评价。', 157, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000158', '25000000-0000-0000-0000-000000000001', 'identify', '/aɪˈdentɪfaɪ/', 'verb', 'Recognize or establish', '中文：识别', 'identify problems', '中文：识别问题', 'Identify the cause.', '中文：识别原因。', 158, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000159', '25000000-0000-0000-0000-000000000001', 'justify', '/ˈdʒʌstɪfaɪ/', 'verb', 'Show or prove to be right', '中文：证明...正当', 'justify the decision', '中文：证明决定的正当性', 'Justify your choice.', '中文：证明你的选择是正当的。', 159, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000160', '25000000-0000-0000-0000-000000000001', 'organize', '/ˈɔːɡənaɪz/', 'verb', 'Arrange systematically', '中文：组织', 'organize events', '中文：组织活动', 'Organize your time.', '中文：组织你的时间。', 160, 4, NOW()
),
-- 第23批：名词 (161-170)
(
  '30000000-0000-0000-0000-000000000161', '25000000-0000-0000-0000-000000000001', 'percentage', '/pərˈsentɪdʒ/', 'noun', 'A rate or proportion per hundred', '中文：百分比', 'high percentage', '中文：高百分比', 'What is the percentage?', '中文：百分比是多少？', 161, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000162', '25000000-0000-0000-0000-000000000001', 'permission', '/pərˈmɪʃn/', 'noun', 'Authorization to do something', '中文：许可', 'ask permission', '中文：请求许可', 'Ask for permission.', '中文：请求许可。', 162, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000163', '25000000-0000-0000-0000-000000000001', 'phenomenon', '/fəˈnɒmɪnən/', 'noun', 'A fact or situation', '中文：现象', 'natural phenomenon', '中文：自然现象', 'This is a phenomenon.', '中文：这是一个现象。', 163, 5, NOW()
),
(
  '30000000-0000-0000-0000-000000000164', '25000000-0000-0000-0000-000000000001', 'philosophy', '/fəˈlɒsəfi/', 'noun', 'The study of knowledge', '中文：哲学', 'philosophy of life', '中文：人生哲学', 'Study philosophy.', '中文：学习哲学。', 164, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000165', '25000000-0000-0000-0000-000000000001', 'population', '/ˌpɒpjuˈleɪʃn/', 'noun', 'All the inhabitants of a particular place', '中文：人口', 'growing population', '中文：增长的人口', 'The population is large.', '中文：人口很多。', 165, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000166', '25000000-0000-0000-0000-000000000001', 'poverty', '/ˈpɒvəti/', 'noun', 'The state of being poor', '中文：贫困', 'live in poverty', '中文：生活在贫困中', 'Fight against poverty.', '中文：与贫困作斗争。', 166, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000167', '25000000-0000-0000-0000-000000000001', 'preparation', '/ˌprepəˈreɪʃn/', 'noun', 'The action of making ready', '中文：准备', 'make preparation', '中文：做准备', 'Preparation is important.', '中文：准备很重要。', 167, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000168', '25000000-0000-0000-0000-000000000001', 'procedure', '/prəˈsiːdʒər/', 'noun', 'An established or official way of doing something', '中文：程序', 'follow procedure', '中文：遵循程序', 'Follow the procedure.', '中文：遵循程序。', 168, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000169', '25000000-0000-0000-0000-000000000001', 'profession', '/prəˈfeʃn/', 'noun', 'A paid occupation', '中文：职业', 'legal profession', '中文：法律职业', 'Choose a profession.', '中文：选择一个职业。', 169, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000170', '25000000-0000-0000-0000-000000000001', 'psychology', '/saɪˈkɒlədʒi/', 'noun', 'The study of mind and behavior', '中文：心理学', 'study psychology', '中文：学习心理学', 'Psychology is interesting.', '中文：心理学很有趣。', 170, 5, NOW()
),
-- 第24批：形容词 (171-180)
(
  '30000000-0000-0000-0000-000000000171', '25000000-0000-0000-0000-000000000001', 'abundant', '/əˈbʌndənt/', 'adjective', 'Existing in large quantities', '中文：丰富的', 'abundant resources', '中文：丰富资源', 'Resources are abundant.', '中文：资源丰富。', 171, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000172', '25000000-0000-0000-0000-000000000001', 'annual', '/ˈænjuəl/', 'adjective', 'Occurring once every year', '中文：每年的', 'annual report', '中文：年度报告', 'This is annual.', '中文：这是每年的。', 172, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000173', '25000000-0000-0000-0000-000000000001', 'apparent', '/əˈpærənt/', 'adjective', 'Clearly visible or understood', '中文：明显的', 'apparent reason', '中文：明显原因', 'It is apparent.', '中文：这很明显。', 173, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000174', '25000000-0000-0000-0000-000000000001', 'appropriate', '/əˈprəʊpriət/', 'adjective', 'Suitable or proper', '中文：适当的', 'appropriate behavior', '中文：适当行为', 'This is appropriate.', '中文：这是适当的。', 174, 5, NOW()
),
(
  '30000000-0000-0000-0000-000000000175', '25000000-0000-0000-0000-000000000001', 'artificial', '/ˌɑːtɪˈfɪʃl/', 'adjective', 'Made or produced by human beings', '中文：人工的', 'artificial intelligence', '中文：人工智能', 'This is artificial.', '中文：这是人工的。', 175, 5, NOW()
),
(
  '30000000-0000-0000-0000-000000000176', '25000000-0000-0000-0000-000000000001', 'atomic', '/əˈtɒmɪk/', 'adjective', 'Relating to atoms', '中文：原子的', 'atomic energy', '中文：原子能', 'This is atomic.', '中文：这是原子的。', 176, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000177', '25000000-0000-0000-0000-000000000001', 'available', '/əˈveɪləbl/', 'adjective', 'Able to be used or obtained', '中文：可用的', 'available resource', '中文：可用资源', 'Is it available?', '中文：可用吗？', 177, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000178', '25000000-0000-0000-0000-000000000001', 'awareness', '/əˈweənəs/', 'noun', 'Knowledge or perception', '中文：意识', 'raise awareness', '中文：提高意识', 'Raise awareness.', '中文：提高意识。', 178, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000179', '25000000-0000-0000-0000-000000000001', 'biological', '/ˌbaɪəˈlɒdʒɪkl/', 'adjective', 'Relating to biology', '中文：生物的', 'biological process', '中文：生物过程', 'This is biological.', '中文：这是生物的。', 179, 5, NOW()
),
(
  '30000000-0000-0000-0000-000000000180', '25000000-0000-0000-0000-000000000001', 'complex', '/ˈkɒmpleks/', 'adjective', 'Consisting of many different parts', '中文：复杂的', 'complex problem', '中文：复杂问题', 'This is complex.', '中文：这很复杂。', 180, 4, NOW()
),
-- 第25批：动词 (181-190)
(
  '30000000-0000-0000-0000-000000000181', '25000000-0000-0000-0000-000000000001', 'acknowledge', '/əkˈnɒlɪdʒ/', 'verb', 'Accept or admit the existence', '中文：承认', 'acknowledge the truth', '中文：承认事实', 'Acknowledge the problem.', '中文：承认问题。', 181, 5, NOW()
),
(
  '30000000-0000-0000-0000-000000000182', '25000000-0000-0000-0000-000000000001', 'accumulate', '/əˈkjuːmjəleɪt/', 'verb', 'Gather together or acquire', '中文：积累', 'accumulate wealth', '中文：积累财富', 'Accumulate knowledge.', '中文：积累知识。', 182, 5, NOW()
),
(
  '30000000-0000-0000-0000-000000000183', '25000000-0000-0000-0000-000000000001', 'adjust', '/əˈdʒʌst/', 'verb', 'Alter or move', '中文：调整', 'adjust the plan', '中文：调整计划', 'Adjust accordingly.', '中文：相应调整。', 183, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000184', '25000000-0000-0000-0000-000000000001', 'appreciate', '/əˈpriːʃieɪt/', 'verb', 'Be grateful for', '中文：感激，欣赏', 'appreciate help', '中文：感激帮助', 'I appreciate you.', '中文：我很感激你。', 184, 5, NOW()
),
(
  '30000000-0000-0000-0000-000000000185', '25000000-0000-0000-0000-000000000001', 'associate', '/əˈsəʊʃieɪt/', 'verb', 'Connect in the mind', '中文：联想', 'associate with', '中文：与...联想', 'Associate ideas.', '中文：联想想法。', 185, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000186', '25000000-0000-0000-0000-000000000001', 'assume', '/əˈsjuːm/', 'verb', 'Suppose to be the case', '中文：假设', 'assume responsibility', '中文：承担责任', 'Do not assume.', '中文：不要假设。', 186, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000187', '25000000-0000-0000-0000-000000000001', 'clarify', '/ˈklærəfaɪ/', 'verb', 'Make clear', '中文：澄清', 'clarify the issue', '中文：澄清问题', 'Let me clarify.', '中文：让我澄清一下。', 187, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000188', '25000000-0000-0000-0000-000000000001', 'collaborate', '/kəˈlæbəreɪt/', 'verb', 'Work jointly on an activity', '中文：合作', 'collaborate with', '中文：与...合作', 'Collaborate effectively.', '中文：有效合作。', 188, 5, NOW()
),
(
  '30000000-0000-0000-0000-000000000189', '25000000-0000-0000-0000-000000000001', 'construct', '/kənˈstrʌkt/', 'verb', 'Build or make', '中文：建造', 'construct a building', '中文：建造建筑', 'Construct carefully.', '中文：仔细建造。', 189, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000190', '25000000-0000-0000-0000-000000000001', 'contribute', '/kənˈtrɪbjuːt/', 'verb', 'Give to help achieve', '中文：贡献', 'contribute to society', '中文：为社会做贡献', 'Contribute positively.', '中文：积极贡献。', 190, 4, NOW()
),
-- 第26批：名词 (191-200)
(
  '30000000-0000-0000-0000-000000000191', '25000000-0000-0000-0000-000000000001', 'abroad', '/əˈbrɔːd/', 'adverb', 'In or to a foreign country', '中文：在国外', 'go abroad', '中文：出国', 'Study abroad.', '中文：出国留学。', 191, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000192', '25000000-0000-0000-0000-000000000001', 'absence', '/ˈæbsəns/', 'noun', 'The state of being away', '中文：缺席', 'absence from work', '中文：缺勤', 'Explain your absence.', '中文：解释你的缺席。', 192, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000193', '25000000-0000-0000-0000-000000000001', 'academy', '/əˈkædəmi/', 'noun', 'A place of study or training', '中文：学院', 'art academy', '中文：艺术学院', 'Join an academy.', '中文：加入学院。', 193, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000194', '25000000-0000-0000-0000-000000000001', 'access', '/ˈækses/', 'noun', 'The means to approach', '中文：访问，使用权', 'have access to', '中文：有权访问', 'Gain access.', '中文：获得访问权。', 194, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000195', '25000000-0000-0000-0000-000000000001', 'accident', '/ˈæksɪdənt/', 'noun', 'An unfortunate incident', '中文：事故', 'car accident', '中文：车祸', 'Avoid accidents.', '中文：避免事故。', 195, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000196', '25000000-0000-0000-0000-000000000001', 'account', '/əˈkaʊnt/', 'noun', 'A report or description', '中文：账户，说明', 'bank account', '中文：银行账户', 'Open an account.', '中文：开一个账户。', 196, 3, NOW()
),
(
  '30000000-0000-0000-0000-000000000197', '25000000-0000-0000-0000-000000000001', 'achievement', '/əˈtʃiːvmənt/', 'noun', 'A thing done successfully', '中文：成就', 'great achievement', '中文：伟大成就', 'Celebrate achievements.', '中文：庆祝成就。', 197, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000198', '25000000-0000-0000-0000-000000000001', 'acquisition', '/ˌækwɪˈzɪʃn/', 'noun', 'An asset or object bought', '中文：获得，收购', 'data acquisition', '中文：数据获取', 'Make an acquisition.', '中文：进行收购。', 198, 5, NOW()
),
(
  '30000000-0000-0000-0000-000000000199', '25000000-0000-0000-0000-000000000001', 'activity', '/ækˈtɪvəti/', 'noun', 'The condition in which things are happening', '中文：活动', 'physical activity', '中文：体育活动', 'Join activities.', '中文：参加活动。', 199, 4, NOW()
),
(
  '30000000-0000-0000-0000-000000000200', '25000000-0000-0000-0000-000000000001', 'administration', '/ədˌmɪnɪˈstreɪʃn/', 'noun', 'The process or activity of managing', '中文：管理', 'business administration', '中文：工商管理', 'Study administration.', '中文：学习管理。', 200, 5, NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 5. 初始化用户对该词书的偏好设置
-- ====================================================================

INSERT INTO public.user_book_preferences (
  id,
  user_id,
  book_id,
  hide_chinese,
  last_resume_state,
  created_at,
  updated_at
)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  'a2afbb4f-dd9c-46bc-a780-b286c1527292',
  '20000000-0000-0000-0000-000000000001',
  false,
  '{}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (user_id, book_id) DO NOTHING;

-- ====================================================================
-- 6. 验证数据导入成功
-- ====================================================================

-- 验证词书
SELECT
  id,
  title,
  total_words,
  is_published
FROM public.books
WHERE id = '20000000-0000-0000-0000-000000000001';

-- 验证章节
SELECT
  id,
  title,
  word_count
FROM public.chapters
WHERE id = '25000000-0000-0000-0000-000000000001';

-- 验证单词数量（应该是200个）
SELECT COUNT(*) as word_count
FROM public.words
WHERE chapter_id = '25000000-0000-0000-0000-000000000001';

-- 验证用户权限
SELECT
  id,
  phone_number,
  feature_permissions,
  book_permissions,
  permission_expires_at
FROM public.users
WHERE id = 'a2afbb4f-dd9c-46bc-a780-b286c1527292';

-- ====================================================================
-- 7. 完成！
-- ====================================================================

-- ✅ 所有200个单词的初始状态为 'new'（未标注）
-- ✅ word_progress 表会在用户首次标记单词时自动创建

-- 现在可以使用 test-user1@example.com / Test123456 登录并运行测试
