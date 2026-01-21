-- 清空用户注册限制和测试数据

-- 1. 删除所有用户进度记录（word_progress）
DELETE FROM word_progress WHERE true;

-- 2. 删除所有flashcard进度（user_book_preferences）
DELETE FROM user_book_preferences WHERE true;

-- 3. 删除所有用户注册（auth.users）
-- 注意：需要通过 Supabase Dashboard 操作，或者使用 RPC 函数

-- 显示剩余数据统计
SELECT 'word_progress' as table_name, COUNT(*) as count FROM word_progress
UNION ALL
SELECT 'user_book_preferences', COUNT(*) FROM user_book_preferences;
