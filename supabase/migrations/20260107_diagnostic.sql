-- 诊断脚本：检查当前数据库状态
-- 请在 Supabase SQL Editor 中执行此脚本

-- 1. 检查 word_progress 表的约束
SELECT '=== word_progress 约束 ===' as info;
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS check_clause
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'word_progress'
  AND con.contype = 'C';

-- 2. 检查触发器是否存在
SELECT '=== 触发器检查 ===' as info;
SELECT
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgfoid::regproc AS function_name
FROM pg_trigger
WHERE tgname LIKE '%mistakes%' OR tgname LIKE '%vocabulary%';

-- 3. 检查 word_progress 表的实际数据（最近10条）
SELECT '=== word_progress 数据样本 ===' as info;
SELECT
  user_id,
  word_id,
  book_id,
  status,
  updated_at
FROM word_progress
ORDER BY updated_at DESC
LIMIT 10;

-- 4. 检查 mistakes 表的 RLS 策略
SELECT '=== mistakes RLS 策略 ===' as info;
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'mistakes';
