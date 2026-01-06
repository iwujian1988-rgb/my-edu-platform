-- ============================================
-- 测试数据生成：20个单词书
-- 创建日期: 2026-01-06
-- 说明：
--   - 10个单词书：章节带场景和主题
--   - 10个单词书：章节不带场景和主题
--   - 每本书100个**不同**的单词
-- ============================================

-- 禁用触发器以提高批量插入性能
SET session_replication_role = replica;

-- ============================================
-- 1. 插入主题和场景数据
-- ============================================

-- 主题
INSERT INTO themes (id, name, description) VALUES
(gen_random_uuid(), '商务', '商务英语相关词汇'),
(gen_random_uuid(), '旅游', '旅游英语相关词汇'),
(gen_random_uuid(), '日常', '日常生活英语词汇'),
(gen_random_uuid(), '科技', '科技英语相关词汇'),
(gen_random_uuid(), '教育', '教育学习相关词汇')
ON CONFLICT (name) DO NOTHING;

-- 场景
INSERT INTO scenes (id, theme_id, name, description) VALUES
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '商务'), '会议', '商务会议相关'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '商务'), '谈判', '商务谈判相关'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '商务'), '邮件', '商务邮件写作'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '旅游'), '机场', '机场相关词汇'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '旅游'), '酒店', '酒店住宿相关'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '旅游'), '餐厅', '餐厅点餐相关'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '日常'), '购物', '购物相关词汇'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '日常'), '家庭', '家庭生活相关'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '日常'), '社交', '社交互动相关'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '科技'), '编程', '编程开发相关'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '科技'), '网络', '互联网相关'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '科技'), '硬件', '计算机硬件相关'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '教育'), '学校', '学校教育相关'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '教育'), '学习', '学习方法相关'),
(gen_random_uuid(), (SELECT id FROM themes WHERE name = '教育'), '考试', '考试相关词汇')
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. 创建20个单词书
-- ============================================

-- 10个带主题和场景的单词书
INSERT INTO books (id, title, description, category, is_official, total_words, total_chapters) VALUES
(gen_random_uuid(), '商务英语核心词汇', '商务工作场景核心词汇', 'scenario', true, 100, 1),
(gen_random_uuid(), '旅游英语应急手册', '出国旅游必备词汇', 'scenario', true, 100, 1),
(gen_random_uuid(), '日常英语会话宝典', '日常生活高频词汇', 'scenario', true, 100, 1),
(gen_random_uuid(), '科技英语前沿词汇', '科技前沿相关词汇', 'scenario', true, 100, 1),
(gen_random_uuid(), '教育英语专业词汇', '教育学习专业词汇', 'scenario', true, 100, 1),
(gen_random_uuid(), '职场英语实用词汇', '职场工作实用词汇', 'scenario', true, 100, 1),
(gen_random_uuid(), '生活英语情景词汇', '生活场景实用词汇', 'scenario', true, 100, 1),
(gen_random_uuid(), '网络英语技术词汇', '网络技术专业词汇', 'scenario', true, 100, 1),
(gen_random_uuid(), '社交英语交际词汇', '社交互动实用词汇', 'scenario', true, 100, 1),
(gen_random_uuid(), '酒店英语服务词汇', '酒店服务专业词汇', 'scenario', true, 100, 1);

-- 10个不带主题和场景的单词书
INSERT INTO books (id, title, description, category, is_official, total_words, total_chapters) VALUES
(gen_random_uuid(), 'CET-4 核心词汇', '大学英语四级考试核心词汇', 'exam', true, 100, 1),
(gen_random_uuid(), 'CET-6 高频词汇', '大学英语六级考试高频词汇', 'exam', true, 100, 1),
(gen_random_uuid(), '考研英语词汇', '研究生入学考试英语词汇', 'exam', true, 100, 1),
(gen_random_uuid(), 'IELTS 雅思词汇', '雅思考试必备词汇', 'exam', true, 100, 1),
(gen_random_uuid(), 'TOEFL 托福词汇', '托福考试核心词汇', 'exam', true, 100, 1),
(gen_random_uuid(), 'GRE 词汇', 'GRE考试必备词汇', 'exam', true, 100, 1),
(gen_random_uuid(), '新概念英语第一册', '新概念英语第一册词汇', 'textbook', true, 100, 1),
(gen_random_uuid(), '新概念英语第二册', '新概念英语第二册词汇', 'textbook', true, 100, 1),
(gen_random_uuid(), '新概念英语第三册', '新概念英语第三册词汇', 'textbook', true, 100, 1),
(gen_random_uuid(), '新概念英语第四册', '新概念英语第四册词汇', 'textbook', true, 100, 1);

-- ============================================
-- 3. 为每本书创建章节并插入100个不同单词
-- ============================================

DO $$
DECLARE
    book_record RECORD;
    chapter_id UUID;
    word_index INTEGER;
    random_theme_id UUID;
    random_scene_id UUID;

    -- 100个不同的英语单词
    base_words TEXT[] := ARRAY[
        'agenda', 'schedule', 'meeting', 'conference', 'presentation',
        'negotiate', 'contract', 'agreement', 'proposal', 'strategy',
        'budget', 'finance', 'revenue', 'profit', 'investment',
        'marketing', 'promotion', 'customer', 'client', 'service',
        'flight', 'boarding', 'passport', 'luggage', 'customs',
        'hotel', 'reservation', 'checkin', 'checkout', 'lobby',
        'restaurant', 'menu', 'order', 'waiter', 'tip',
        'breakfast', 'lunch', 'dinner', 'coffee', 'tea',
        'shopping', 'store', 'price', 'discount', 'sale',
        'school', 'teacher', 'student', 'classroom', 'homework',
        'family', 'parent', 'child', 'brother', 'sister',
        'computer', 'software', 'hardware', 'internet', 'network',
        'programming', 'code', 'algorithm', 'database', 'server',
        'hospital', 'doctor', 'nurse', 'medicine', 'patient',
        'symptom', 'disease', 'treatment', 'cure', 'recovery',
        'analysis', 'approach', 'area', 'assessment', 'assume',
        'authority', 'available', 'aware', 'benefit', 'concept',
        'consistent', 'context', 'create', 'data', 'definition',
        'develop', 'economy', 'educate', 'element', 'environment'
    ];

    phonetics TEXT[] := ARRAY[
        '/əˈdʒendə/', '/ˈʃedjuːl/', '/ˈmiːtɪŋ/', '/ˈkɒnfərəns/', '/ˌprezənˈteɪʃn/',
        '/nɪˈɡəʊʃieɪt/', '/ˈkɒntrækt/', '/əˈɡriːmənt/', '/prəˈpəʊzl/', '/ˈstrætədʒi/',
        '/ˈbʌdʒɪt/', '/faɪˈnæns/', '/ˈrevənjuː/', '/ˈprɒfɪt/', '/ɪnˈvestmənt/',
        '/ˈmɑːkɪtɪŋ/', '/prəˈməʊʃn/', '/ˈkʌstəmə/', '/klaɪənt/', '/ˈsɜːvɪs/',
        '/flaɪt/', '/ˈbɔːdɪŋ/', '/ˈpɑːspɔːt/', '/ˈlʌɡɪdʒ/', '/ˈkʌstəmz/',
        '/həʊˈtel/', '/ˌrezəˈveɪʃn/', '/ˈtʃekɪn/', '/ˈtʃekaʊt/', '/ˈlɒbi/',
        '/ˈrestrɒnt/', '/ˈmenjuː/', '/ˈɔːdə/', '/ˈweɪtə/', '/tɪp/',
        '/ˈbrekfəst/', '/ˈlʌntʃ/', '/ˈdɪnə/', '/ˈkɒfi/', '/tiː/',
        '/ˈʃɒpɪŋ/', '/stɔː/', '/praɪs/', '/ˈdɪskaʊnt/', '/seɪl/',
        '/skuːl/', '/ˈtiːtʃə/', '/ˈstjuːdənt/', '/ˈklɑːsruːm/', '/ˈhəʊmwɜːk/',
        '/ˈfæmɪli/', '/ˈpeərənt/', '/tʃaɪld/', '/ˈbrʌðə/', '/ˈsɪstə/',
        '/kəmˈpjuːtə/', '/ˈsɒftweə/', '/ˈhɔːdweə/', '/ˈɪntənet/', '/ˈnetwɜːk/',
        '/ˈprəʊɡræmɪŋ/', '/kəʊd/', '/ˈælɡərɪðəm/', '/ˈdeɪtəbeɪs/', '/ˈsɜːvə/',
        '/ˈhɒspɪtl/', '/ˈdɒktə/', '/nɜːs/', '/ˈmedɪsɪn/', '/ˈpeɪʃənt/',
        '/ˈsɪmptəm/', '/dɪˈziːz/', '/ˈtriːtmənt/', '/kjʊə/', '/rɪˈkʌvəri/',
        '/əˈnæləsɪs/', '/əˈprəʊtʃ/', '/ˈeəriə/', '/əˈsesmənt/', '/əˈsjuːm/',
        '/ɔːˈθɒrəti/', '/əˈveɪləbl/', '/əˈweə/', '/ˈbenɪfɪt/', '/ˈkɒnsept/',
        '/kənˈsɪstənt/', '/ˈkɒntekst/', '/kriˈeɪt/', '/ˈdeɪtə/', '/ˌdefɪˈnɪʃn/',
        '/dɪˈveləp/', '/ɪˈkɒnəmi/', '/ˈedʒʊkeɪt/', '/ˈelɪmənt/', '/ɪnˈvaɪrənmənt/'
    ];

    definitions TEXT[] := ARRAY[
        '议程，日程表', '时间表，进度表', '会议', '会议，大会', '演示，报告',
        '谈判，商议', '合同，契约', '协议，同意', '提议，建议', '策略，战略',
        '预算', '财政，金融', '收入，收益', '利润，盈利', '投资',
        '市场营销', '促销，推广', '顾客，客户', '客户', '服务',
        '飞行，航班', '登机', '护照', '行李', '海关',
        '酒店', '预订', '入住登记', '退房结账', '大堂',
        '餐厅', '菜单', '点餐，订单', '服务员', '小费',
        '早餐', '午餐', '晚餐', '咖啡', '茶',
        '购物', '商店', '价格', '折扣', '销售',
        '学校', '教师', '学生', '教室', '家庭作业',
        '家庭', '父母', '孩子', '兄弟', '姐妹',
        '电脑，计算机', '软件', '硬件', '互联网，因特网', '网络',
        '编程', '代码', '算法', '数据库', '服务器',
        '医院', '医生', '护士', '药，药物', '病人',
        '症状', '疾病', '治疗，疗法', '治愈', '康复',
        '分析，解析', '方法，途径', '区域，领域', '评估，评价', '假设',
        '权威，当局', '可用的', '意识到的', '利益，好处', '概念，观念',
        '一致的', '上下文，语境', '创造', '数据', '定义，释义',
        '发展，开发', '经济', '教育', '要素，元素', '环境'
    ];

    collocations TEXT[] := ARRAY[
        'on the agenda', 'tight schedule', 'attend a meeting', 'press conference', 'give a presentation',
        'negotiate a deal', 'sign a contract', 'reach an agreement', 'make a proposal', 'business strategy',
        'annual budget', 'finance department', 'revenue stream', 'net profit', 'foreign investment',
        'marketing campaign', 'sales promotion', 'customer service', 'client relationship', 'good service',
        'book a flight', 'boarding pass', 'check passport', 'carry luggage', 'go through customs',
        'luxury hotel', 'make a reservation', 'check into hotel', 'check out of hotel', 'hotel lobby',
        'fancy restaurant', 'look at menu', 'place an order', 'call the waiter', 'leave a tip',
        'eat breakfast', 'pack lunch', 'cook dinner', 'drink coffee', 'drink tea',
        'go shopping', 'open store', 'reasonable price', 'big discount', 'on sale',
        'attend school', 'strict teacher', 'smart student', 'quiet classroom', 'do homework',
        'love family', 'supportive parent', 'young child', 'older brother', 'younger sister',
        'use computer', 'install software', 'upgrade hardware', 'access internet', 'fast network',
        'learn programming', 'write code', 'design algorithm', 'query database', 'deploy server',
        'visit hospital', 'see doctor', 'call nurse', 'take medicine', 'help patient',
        'notice symptom', 'treat disease', 'effective treatment', 'fully cure', 'speedy recovery',
        'careful analysis', 'new approach', 'local area', 'detailed assessment', 'assume responsibility',
        'government authority', 'readily available', 'well aware', 'mutual benefit', 'core concept',
        'consistent result', 'social context', 'create value', 'collect data', 'precise definition',
        'develop skill', 'global economy', 'educate children', 'chemical element', 'protect environment'
    ];

    examples TEXT[] := ARRAY[
        'Let us put this on the agenda.', 'We need a tight schedule.', 'I have a meeting at 3 PM.',
        'The conference was informative.', 'She gave an excellent presentation.', 'We need to negotiate.',
        'Both parties signed the contract.', 'We reached an agreement.', 'I have a proposal.',
        'Our strategy needs revision.', 'The budget was approved.', 'He works in finance.',
        'Revenue has increased.', 'We made a profit.', 'We need investment.',
        'Our marketing campaign works.', 'They have a promotion.', 'Customer satisfaction is important.',
        'We have a new client.', 'The service was excellent.', 'I need to book a flight.',
        'Where is the boarding gate?', 'Please show your passport.', 'How many pieces of luggage?',
        'You need to go through customs.', 'We stayed at a luxury hotel.', 'I have a reservation.',
        'What time is check-in?', 'We need to check out.', 'The lobby is beautiful.',
        'This restaurant has great food.', 'Can I see the menu?', 'I would like to place an order.',
        'Waiter, please bring me some water.', 'Do not forget to leave a tip.', 'What would you like for breakfast?',
        'Let us have lunch together.', 'We are having dinner with friends.', 'Would you like some coffee?',
        'I prefer tea in the morning.', 'I went shopping yesterday.', 'The store is closed.',
        'The price is too high.', 'There is a big discount today.', 'Everything is on sale.',
        'The school is near my house.', 'Our teacher is very strict.', 'Every student must participate.',
        'The classroom is on the second floor.', 'I have not done my homework.', 'I love my family.',
        'My parents are very supportive.', 'The child is playing outside.', 'My brother is older than me.',
        'I have one sister.', 'I need a new computer.', 'This software is easy to use.',
        'We need to upgrade our hardware.', 'The internet is not working.', 'Our network is very fast.',
        'I am learning programming.', 'Can you read this code?', 'This algorithm is very efficient.',
        'We need to query the database.', 'The server is down.', 'I went to the hospital yesterday.',
        'The doctor said I need rest.', 'The nurse was very kind.', 'Take this medicine twice a day.',
        'The patient is recovering well.', 'What are your symptoms?', 'It is a common disease.',
        'The treatment is working.', 'You will be cured soon.', 'Your recovery is going well.',
        'We need a detailed analysis.', 'This is a new approach.', 'It covers a wide area.',
        'The assessment was positive.', 'I assume you agree.', 'The government has the authority.',
        'The data is readily available.', 'I was well aware of the problem.', 'It is for our mutual benefit.',
        'This is the core concept.', 'The results are consistent.', 'Look at the social context.',
        'We need to create value.', 'Please collect the data.', 'What is the precise definition?',
        'Skills can be developed.', 'The global economy is improving.', 'We need to educate our children.',
        'It is a chemical element.', 'We must protect the environment.'
    ];

    parts_of_speech TEXT[] := ARRAY[
        'noun', 'noun', 'noun', 'noun', 'noun',
        'verb', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'noun', 'noun', 'noun',
        'noun', 'noun', 'verb', 'verb', 'verb'
    ];

    current_word TEXT;

BEGIN
    -- 遍历前10本书（章节带主题和场景）
    FOR book_record IN
        SELECT id, title
        FROM books
        WHERE title IN (
            '商务英语核心词汇', '旅游英语应急手册', '日常英语会话宝典', '科技英语前沿词汇',
            '教育英语专业词汇', '职场英语实用词汇', '生活英语情景词汇', '网络英语技术词汇',
            '社交英语交际词汇', '酒店英语服务词汇'
        )
        ORDER BY created_at DESC
    LOOP
        -- 随机选择主题和场景
        random_theme_id := (SELECT id FROM themes ORDER BY RANDOM() LIMIT 1);
        random_scene_id := (SELECT id FROM scenes ORDER BY RANDOM() LIMIT 1);

        -- 为每本书创建一个章节（带主题和场景）
        INSERT INTO chapters (id, book_id, title, order_index, word_count, theme_id, scene_id)
        VALUES (gen_random_uuid(), book_record.id, '第一章', 1, 100, random_theme_id, random_scene_id)
        RETURNING id INTO chapter_id;

        -- 插入100个不同的单词
        FOR word_index IN 1..100 LOOP
            current_word := base_words[word_index];

            -- 插入单词
            INSERT INTO words (chapter_id, word, phonetic, definition, definition_en,
                               collocation, collocation_en, example_sentence, example_sentence_en,
                               part_of_speech, order_index)
            VALUES (
                chapter_id,
                current_word,
                phonetics[word_index],
                definitions[word_index],
                'A ' || current_word || ' related concept or action.',
                collocations[word_index],
                collocations[word_index],
                examples[word_index],
                examples[word_index],
                parts_of_speech[word_index],
                word_index
            );
        END LOOP;

        RAISE NOTICE '已为书籍 [%] 插入 100 个不同单词（章节带主题和场景）', book_record.title;
    END LOOP;

    -- 遍历后10本书（章节不带主题和场景）
    FOR book_record IN
        SELECT id, title
        FROM books
        WHERE title IN (
            'CET-4 核心词汇', 'CET-6 高频词汇', '考研英语词汇', 'IELTS 雅思词汇',
            'TOEFL 托福词汇', 'GRE 词汇', '新概念英语第一册', '新概念英语第二册',
            '新概念英语第三册', '新概念英语第四册'
        )
        ORDER BY created_at DESC
    LOOP
        -- 为每本书创建一个章节（不带主题和场景）
        INSERT INTO chapters (id, book_id, title, order_index, word_count)
        VALUES (gen_random_uuid(), book_record.id, '第一章', 1, 100)
        RETURNING id INTO chapter_id;

        -- 插入100个不同的单词
        FOR word_index IN 1..100 LOOP
            current_word := base_words[word_index];

            -- 插入单词
            INSERT INTO words (chapter_id, word, phonetic, definition, definition_en,
                               collocation, collocation_en, example_sentence, example_sentence_en,
                               part_of_speech, order_index)
            VALUES (
                chapter_id,
                current_word,
                phonetics[word_index],
                definitions[word_index],
                'A ' || current_word || ' related concept or action.',
                collocations[word_index],
                collocations[word_index],
                examples[word_index],
                examples[word_index],
                parts_of_speech[word_index],
                word_index
            );
        END LOOP;

        RAISE NOTICE '已为书籍 [%] 插入 100 个不同单词（章节不带主题和场景）', book_record.title;
    END LOOP;

    RAISE NOTICE '============================================';
    RAISE NOTICE '测试数据插入完成！';
    RAISE NOTICE '已创建 20 个单词书';
    RAISE NOTICE '- 10 本书：章节带主题和场景';
    RAISE NOTICE '- 10 本书：章节不带主题和场景';
    RAISE NOTICE '- 每本书包含 100 个不同单词';
    RAISE NOTICE '============================================';

END $$;

-- 重新启用触发器
SET session_replication_role = DEFAULT;

-- ============================================
-- 验证查询
-- ============================================

-- 查看所有单词书及其单词数量
SELECT
    b.title,
    b.category,
    COUNT(w.id) as word_count,
    COUNT(DISTINCT w.word) as unique_words,
    COUNT(DISTINCT c.id) FILTER (WHERE c.theme_id IS NOT NULL) as chapters_with_theme,
    COUNT(DISTINCT c.id) FILTER (WHERE c.theme_id IS NULL) as chapters_without_theme
FROM books b
LEFT JOIN chapters c ON c.book_id = b.id
LEFT JOIN words w ON w.chapter_id = c.id
GROUP BY b.id, b.title, b.category
ORDER BY b.created_at DESC;
