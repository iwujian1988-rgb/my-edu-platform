-- ============================================
-- 删除前数据统计脚本
-- ============================================
-- 用途：在删除书籍前，统计当前数据库中的数据量
-- 执行方式：直接运行此SQL查看统计结果
-- ============================================

SELECT
    '📚 书籍统计' as category,
    json_build_object(
        '总书籍数', (SELECT COUNT(*) FROM books),
        '官方书籍', (SELECT COUNT(*) FROM books WHERE is_official = true),
        '自定义书籍', (SELECT COUNT(*) FROM books WHERE is_official = false),
        '已发布书籍', (SELECT COUNT(*) FROM books WHERE is_published = true)
    ) as stats
UNION ALL

SELECT
    '📖 章节统计' as category,
    json_build_object(
        '总章节数', (SELECT COUNT(*) FROM chapters),
        '平均每本书章节数', ROUND((SELECT AVG(chapter_count) FROM (SELECT COUNT(*) as chapter_count FROM chapters GROUP BY book_id) t), 2)
    ) as stats
UNION ALL

SELECT
    '📝 单词统计' as category,
    json_build_object(
        '总单词数', (SELECT COUNT(*) FROM words),
        '平均每章单词数', ROUND((SELECT AVG(word_count) FROM (SELECT COUNT(*) as word_count FROM words GROUP BY chapter_id) t), 2)
    ) as stats
UNION ALL

SELECT
    '👤 用户数据统计' as category,
    json_build_object(
        '用户总数', (SELECT COUNT(*) FROM users),
        '有学习进度的用户', (SELECT COUNT(DISTINCT user_id) FROM word_progress),
        '学习进度记录总数', (SELECT COUNT(*) FROM word_progress),
        '学习记录总数', (SELECT COUNT(*) FROM learning_records),
        '错题本记录总数', (SELECT COUNT(*) FROM mistakes),
        '生词日历记录总数', (SELECT COUNT(*) FROM vocabulary_calendar),
        '用户偏好设置总数', (SELECT COUNT(*) FROM user_book_preferences)
    ) as stats
UNION ALL

SELECT
    '📊 学习状态分布' as category,
    json_build_object(
        'new-未学习', (SELECT COUNT(*) FROM word_progress WHERE status = 'new'),
        'known-认识', (SELECT COUNT(*) FROM word_progress WHERE status = 'known'),
        'vague-模糊', (SELECT COUNT(*) FROM word_progress WHERE status = 'vague'),
        'unknown-不认识', (SELECT COUNT(*) FROM word_progress WHERE status = 'unknown')
    ) as stats;

-- ============================================
-- 按书籍统计详细信息
-- ============================================

\echo '========================================'
\echo '📚 各书籍详细信息'
\echo '========================================'

SELECT
    b.title as 书籍名称,
    b.is_official as 是否官方,
    (SELECT COUNT(*) FROM chapters WHERE book_id = b.id) as 章节数,
    (SELECT COUNT(*) FROM words w JOIN chapters c ON w.chapter_id = c.id WHERE c.book_id = b.id) as 单词数,
    (SELECT COUNT(*) FROM word_progress WHERE book_id = b.id) as 学习进度记录数,
    (SELECT COUNT(*) FROM mistakes WHERE book_id = b.id) as 错题记录数,
    b.created_at as 创建时间
FROM books b
ORDER BY b.created_at DESC;

-- ============================================
-- 按用户统计学习进度
-- ============================================

\echo '========================================'
\echo '👤 用户学习进度分布（前10名）'
\echo '========================================'

SELECT
    u.phone_number as 用户手机号,
    u.created_at as 注册时间,
    COUNT(wp.id) as 学习进度记录数,
    COUNT(DISTINCT wp.book_id) as 学习书籍数,
    COUNT(*) FILTER (WHERE wp.status = 'known') as 已认识,
    COUNT(*) FILTER (WHERE wp.status = 'vague') as 模糊,
    COUNT(*) FILTER (WHERE wp.status = 'unknown') as 不认识
FROM users u
LEFT JOIN word_progress wp ON u.id = wp.user_id
GROUP BY u.id, u.phone_number, u.created_at
ORDER BY 学习进度记录数 DESC
LIMIT 10;

\echo '========================================'
\echo '✅ 统计完成！'
\echo '========================================'
