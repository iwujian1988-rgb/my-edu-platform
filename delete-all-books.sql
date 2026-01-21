-- ============================================
-- 删除所有书籍及关联数据
-- ============================================
-- ⚠️ 警告：此脚本会删除所有书籍相关数据
-- ⚠️ 执行前请确保已备份数据库
-- ⚠️ 此操作不可逆！
-- ============================================

-- 开始事务（如果出错可以回滚）
BEGIN;

-- ============================================
-- 步骤 0: 数据统计（执行前确认）
-- ============================================

DO $$
DECLARE
    v_books INT;
    v_chapters INT;
    v_words INT;
    v_word_progress INT;
    v_learning_records INT;
    v_mistakes INT;
    v_vocabulary_calendar INT;
    v_user_preferences INT;
BEGIN
    -- 统计即将删除的数据量
    SELECT COUNT(*) INTO v_books FROM books;
    SELECT COUNT(*) INTO v_chapters FROM chapters;
    SELECT COUNT(*) INTO v_words FROM words;
    SELECT COUNT(*) INTO v_word_progress FROM word_progress;
    SELECT COUNT(*) INTO v_learning_records FROM learning_records;
    SELECT COUNT(*) INTO v_mistakes FROM mistakes;
    SELECT COUNT(*) INTO v_vocabulary_calendar FROM vocabulary_calendar;
    SELECT COUNT(*) INTO v_user_preferences FROM user_book_preferences;

    -- 输出统计信息
    RAISE NOTICE '========================================';
    RAISE NOTICE '即将删除的数据统计：';
    RAISE NOTICE '  书籍数量: %', v_books;
    RAISE NOTICE '  章节数量: %', v_chapters;
    RAISE NOTICE '  单词数量: %', v_words;
    RAISE NOTICE '  学习进度记录: %', v_word_progress;
    RAISE NOTICE '  学习记录: %', v_learning_records;
    RAISE NOTICE '  错题本记录: %', v_mistakes;
    RAISE NOTICE '  生词日历记录: %', v_vocabulary_calendar;
    RAISE NOTICE '  用户偏好设置: %', v_user_preferences;
    RAISE NOTICE '========================================';
    RAISE NOTICE '⚠️  即将执行删除操作，请确认！';
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 步骤 1: 删除用户偏好设置
-- ============================================
DELETE FROM user_book_preferences;
RAISE NOTICE '✅ 已删除用户偏好设置';

-- ============================================
-- 步骤 2: 删除生词日历
-- ============================================
DELETE FROM vocabulary_calendar;
RAISE NOTICE '✅ 已删除生词日历';

-- ============================================
-- 步骤 3: 删除错题本
-- ============================================
DELETE FROM mistakes;
RAISE NOTICE '✅ 已删除错题本';

-- ============================================
-- 步骤 4: 删除学习记录
-- ============================================
DELETE FROM learning_records;
RAISE NOTICE '✅ 已删除学习记录';

-- ============================================
-- 步骤 5: 删除学习进度
-- ============================================
DELETE FROM word_progress;
RAISE NOTICE '✅ 已删除学习进度';

-- ============================================
-- 步骤 6: 删除单词
-- ============================================
DELETE FROM words;
RAISE NOTICE '✅ 已删除单词';

-- ============================================
-- 步骤 7: 删除章节
-- ============================================
DELETE FROM chapters;
RAISE NOTICE '✅ 已删除章节';

-- ============================================
-- 步骤 8: 删除书籍
-- ============================================
DELETE FROM books;
RAISE NOTICE '✅ 已删除书籍';

-- ============================================
-- 步骤 9: 验证删除结果
-- ============================================
DO $$
DECLARE
    v_remaining_books INT;
    v_remaining_chapters INT;
    v_remaining_words INT;
    v_remaining_word_progress INT;
    v_remaining_learning_records INT;
    v_remaining_mistakes INT;
    v_remaining_vocabulary_calendar INT;
    v_remaining_user_preferences INT;
BEGIN
    -- 检查是否还有剩余数据
    SELECT COUNT(*) INTO v_remaining_books FROM books;
    SELECT COUNT(*) INTO v_remaining_chapters FROM chapters;
    SELECT COUNT(*) INTO v_remaining_words FROM words;
    SELECT COUNT(*) INTO v_remaining_word_progress FROM word_progress;
    SELECT COUNT(*) INTO v_remaining_learning_records FROM learning_records;
    SELECT COUNT(*) INTO v_remaining_mistakes FROM mistakes;
    SELECT COUNT(*) INTO v_remaining_vocabulary_calendar FROM vocabulary_calendar;
    SELECT COUNT(*) INTO v_remaining_user_preferences FROM user_book_preferences;

    -- 输出验证结果
    RAISE NOTICE '========================================';
    RAISE NOTICE '删除后剩余数据：';
    RAISE NOTICE '  书籍: %', v_remaining_books;
    RAISE NOTICE '  章节: %', v_remaining_chapters;
    RAISE NOTICE '  单词: %', v_remaining_words;
    RAISE NOTICE '  学习进度: %', v_remaining_word_progress;
    RAISE NOTICE '  学习记录: %', v_remaining_learning_records;
    RAISE NOTICE '  错题本: %', v_remaining_mistakes;
    RAISE NOTICE '  生词日历: %', v_remaining_vocabulary_calendar;
    RAISE NOTICE '  用户偏好: %', v_remaining_user_preferences;
    RAISE NOTICE '========================================';

    -- 检查是否有数据残留
    IF v_remaining_books > 0 OR
       v_remaining_chapters > 0 OR
       v_remaining_words > 0 OR
       v_remaining_word_progress > 0 OR
       v_remaining_learning_records > 0 OR
       v_remaining_mistakes > 0 OR
       v_remaining_vocabulary_calendar > 0 OR
       v_remaining_user_preferences > 0 THEN
        RAISE EXCEPTION '❌ 删除失败：仍有数据残留！';
    ELSE
        RAISE NOTICE '✅ 所有数据已成功删除！';
    END IF;
END $$;

-- 提交事务
COMMIT;

-- ============================================
-- 重置序列（如果使用了自增ID）
-- ============================================
-- 注意：UUID不需要重置序列

RAISE NOTICE '========================================';
RAISE NOTICE '🎉 删除完成！数据库已准备好导入新数据。';
RAISE NOTICE '========================================';
