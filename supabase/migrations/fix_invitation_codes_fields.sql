-- ============================================
-- 修复邀请码表字段 - 在 Supabase 控制台执行
-- ============================================

-- 1. 检查当前表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'invitation_codes'
ORDER BY ordinal_position;

-- 2. 如果需要，可以添加 created_by_admin 字段（执行迁移）
-- 这已经在 20260106_modify_invitation_codes_table.sql 中定义
-- 如果迁移未执行，请在 Supabase 控制台的 SQL Editor 中执行该迁移文件
