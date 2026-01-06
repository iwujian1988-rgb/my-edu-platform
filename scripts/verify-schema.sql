-- ============================================
-- Schema 验证脚本
-- 执行完 schema.sql 后运行此脚本验证
-- ============================================

-- 1. 检查表数量（应该是 12）
SELECT 'Table Count' as check_type, COUNT(*) as result
FROM pg_tables
WHERE schemaname = 'public';

-- 2. 列出所有表
SELECT 'Tables' as check_type, tablename as name
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. 检查触发器（应该是 4）
SELECT 'Trigger Count' as check_type, COUNT(*) as result
FROM pg_trigger
WHERE tgname LIKE 'trigger_%';

-- 4. 列出所有触发器
SELECT 'Triggers' as check_type, tgname as name
FROM pg_trigger
WHERE tgname LIKE 'trigger_%'
ORDER BY tgname;

-- 5. 检查视图（应该是 1）
SELECT 'View Count' as check_type, COUNT(*) as result
FROM pg_views
WHERE schemaname = 'public';

-- 6. 列出所有视图
SELECT 'Views' as check_type, viewname as name
FROM pg_views
WHERE schemaname = 'public';

-- 7. 测试插入数据到 themes 表
INSERT INTO themes (name, description)
VALUES ('Test Theme', 'This is a test theme')
ON CONFLICT (name) DO NOTHING;

-- 8. 查询测试数据
SELECT * FROM themes WHERE name = 'Test Theme';

-- 9. 清理测试数据
DELETE FROM themes WHERE name = 'Test Theme';

-- 10. 显示成功消息
SELECT '✅ Schema Verification Complete!' as message;
SELECT 'Please check above results:' as info;
SELECT '- Table Count should be: 12' as info;
SELECT '- Trigger Count should be: 4' as info;
SELECT '- View Count should be: 1' as info;
SELECT '- Test INSERT should work' as info;
