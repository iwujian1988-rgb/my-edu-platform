# 数据库 Migration 执行指南

**创建日期**: 2026-01-06
**版本**: v1.0

---

## 📋 已创建的 Migration 文件

本次更新创建了 5 个 migration 文件来修复和扩展数据库结构：

### 1. administrators 表
**文件**: `supabase/migrations/20260106_create_administrators_table.sql`

**功能**:
- 创建管理员表
- 支持 RBAC 权限系统（super_admin, content_admin, support）
- 添加初始超级管理员记录

**默认管理员**:
- 邮箱: `admin@xiaoyu.com`
- 需要通过 Supabase Auth 设置密码

---

### 2. admin_audit_logs 表
**文件**: `supabase/migrations/20260106_create_admin_audit_logs_table.sql`

**功能**:
- 记录所有管理员操作
- 支持审计和安全监控
- 包含 IP 地址、User-Agent 等信息

---

### 3. invitation_codes 表扩展
**文件**: `supabase/migrations/20260106_modify_invitation_codes_table.sql`

**功能**:
- 添加 `created_by_admin` 字段（引用管理员表）
- 保留原有 `created_by` 字段（向后兼容）
- 创建视图 `invitation_codes_with_creator` 简化查询

---

### 4. users 表扩展
**文件**: `supabase/migrations/20260106_add_user_ban_fields.sql`

**功能**:
- 添加用户封禁相关字段
- 支持永久封禁和临时封禁
- 创建辅助函数 `is_user_banned()` 和 `auto_unban_users()`

**新增字段**:
- `is_banned`: 是否被封禁
- `banned_at`: 封禁时间
- `banned_by`: 封禁人ID
- `ban_reason`: 封禁原因
- `ban_expires_at`: 封禁过期时间（临时封禁）

---

### 5. books 表扩展
**文件**: `supabase/migrations/20260106_add_book_review_fields.sql`

**功能**:
- 添加词库审核相关字段
- 支持用户词库审核流程
- 创建视图 `books_pending_review`
- 创建辅助函数 `resubmit_book_for_review()`

**新增字段**:
- `review_status`: 审核状态（pending | approved | rejected）
- `review_reason`: 审核意见/拒绝原因
- `reviewed_by`: 审核人ID
- `reviewed_at`: 审核时间

---

### 6. words 表章节可选改造
**文件**: `supabase/migrations/20260108_make_words_chapter_optional.sql`

**功能**:
- 支持无章节的单词书（单词手册模式）
- 将 `words.chapter_id` 改为可选（允许 NULL）
- 添加 `words.book_id` 字段（用于无章节模式）
- 为已有数据填充 `book_id`
- 创建性能优化索引

**变更**:
- `words.chapter_id`: NOT NULL → NULL ✓
- `words.book_id`: 新增字段（UUID，引用 books.id）

**支持模式**:
1. **有章节模式（教材）**: `chapter_id` 非空，`book_id` 可选
2. **无章节模式（单词手册）**: `chapter_id` 为空，`book_id` 必填

---

## 🚀 执行步骤

### 方法 1: 使用 Supabase CLI（推荐）

```bash
# 1. 确保已登录 Supabase
supabase login

# 2. 链接到你的项目
supabase link --project-ref YOUR_PROJECT_REF

# 3. 应用 migration
supabase db push

# 4. 验证表是否创建成功
supabase db remote tables
```

### 方法 2: 使用 Supabase Dashboard

1. 登录 Supabase Dashboard
2. 选择你的项目
3. 进入 **SQL Editor**
4. 依次执行每个 migration 文件中的 SQL 代码
5. 检查 **Table Viewer** 确认表创建成功

### 方法 3: 使用 psql 命令行

```bash
psql -h db.xxx.supabase.co -U postgres -d postgres < supabase/migrations/20260106_create_administrators_table.sql
psql -h db.xxx.supabase.co -U postgres -d postgres < supabase/migrations/20260106_create_admin_audit_logs_table.sql
psql -h db.xxx.supabase.co -U postgres -d postgres < supabase/migrations/20260106_modify_invitation_codes_table.sql
psql -h db.xxx.supabase.co -U postgres -d postgres < supabase/migrations/20260106_add_user_ban_fields.sql
psql -h db.xxx.supabase.co -U postgres -d postgres < supabase/migrations/20260106_add_book_review_fields.sql
psql -h db.xxx.supabase.co -U postgres -d postgres < supabase/migrations/20260108_make_words_chapter_optional.sql
```

---

## ✅ 验证 Migration 成功

执行以下 SQL 查询验证：

```sql
-- 1. 检查新表是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('administrators', 'admin_audit_logs')
ORDER BY table_name;

-- 预期结果：
-- administrators
-- admin_audit_logs

-- 2. 检查新增字段是否存在
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('is_banned', 'banned_at', 'banned_by', 'ban_reason', 'ban_expires_at')
ORDER BY ordinal_position;

-- 预期结果：5行，包含新增的封禁字段

-- 3. 检查 books 表新增字段
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'books'
  AND column_name IN ('review_status', 'review_reason', 'reviewed_by', 'reviewed_at')
ORDER BY ordinal_position;

-- 预期结果：4行，包含新增的审核字段

-- 4. 检查 invitation_codes 表新增字段
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'invitation_codes'
  AND column_name = 'created_by_admin';

-- 预期结果：1行，created_by_admin 字段

-- 5. 检查 words 表新增字段和修改
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'words'
  AND column_name IN ('chapter_id', 'book_id')
ORDER BY column_name;

-- 预期结果：
-- - chapter_id: is_nullable = 'YES'（已改为可选）
-- - book_id: 新增字段，is_nullable = 'YES'

-- 6. 验证 book_id 索引是否创建
SELECT indexname
FROM pg_indexes
WHERE tablename = 'words'
  AND indexname = 'words_book_id_idx';

-- 预期结果：1行，索引已创建

-- 7. 检查初始管理员数据
SELECT * FROM administrators WHERE email = 'admin@xiaoyu.com';

-- 预期结果：1行，超级管理员记录
```

---

## 👤 创建初始管理员账户

Migration 执行成功后，需要创建初始管理员账户：

### 步骤 1: 在 Supabase Auth 中创建用户

1. 登录 Supabase Dashboard
2. 进入 **Authentication** → **Users**
3. 点击 **Add user** → **Create new user**
4. 填写信息：
   - **Email**: `admin@xiaoyu.com`
   - **Password**: 设置一个强密码（如：`Admin123456!`）
   - **Auto Confirm User**: ✅ 勾选
5. 点击 **Create user**

### 步骤 2: 更新 administrators 表的 user_id

```sql
-- 获取刚创建的 auth.users.id（从 Supabase Dashboard 复制）
UPDATE administrators
SET user_id = 'auth-user-id-from-step-1'
WHERE email = 'admin@xiaoyu.com';
```

或者执行以下 SQL（通过邮箱匹配）：

```sql
UPDATE administrators a
SET user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@xiaoyu.com'
)
WHERE a.email = 'admin@xiaoyu.com';
```

### 步骤 3: 验证管理员账户

```sql
SELECT
  a.id,
  a.user_id,
  a.role,
  a.name,
  a.email,
  a.is_active,
  u.email as auth_email
FROM administrators a
LEFT JOIN auth.users u ON a.user_id = u.id
WHERE a.email = 'admin@xiaoyu.com';
```

---

## 🔒 安全建议

1. **修改默认密码**: 首次登录后立即修改管理员密码
2. **限制管理IP**: 考虑在 Supabase Dashboard 设置 IP 白名单
3. **启用2FA**: 为管理员账户启用双因素认证（未来功能）
4. **定期审计**: 定期检查 `admin_audit_logs` 表

---

## 📝 注意事项

### is_active vs is_banned

- `is_active = false`: 账户未激活（如邮箱未验证）
- `is_banned = true`: 账户被封禁（违规操作）
- 登录时需要同时检查这两个字段

### 邀请码 created_by vs created_by_admin

- `created_by`: 引用 `users` 表（用户邀请用户）
- `created_by_admin`: 引用 `administrators` 表（管理员创建邀请码）
- 查询时优先检查 `created_by_admin`

### 审核状态 review_status

- `pending`: 待审核（默认）
- `approved`: 已通过（对所有用户可见）
- `rejected`: 已拒绝（仅对创建者可见）
- 官方词库自动设置为 `approved`

---

## 🔄 回滚 Migration

如果需要回滚：

```sql
-- 1. 删除新增的表
DROP TABLE IF EXISTS admin_audit_logs CASCADE;
DROP TABLE IF EXISTS administrators CASCADE;

-- 2. 删除新增的列
ALTER TABLE users DROP COLUMN IF EXISTS is_banned;
ALTER TABLE users DROP COLUMN IF EXISTS banned_at;
ALTER TABLE users DROP COLUMN IF EXISTS banned_by;
ALTER TABLE users DROP COLUMN IF EXISTS ban_reason;
ALTER TABLE users DROP COLUMN IF EXISTS ban_expires_at;

ALTER TABLE books DROP COLUMN IF EXISTS review_status;
ALTER TABLE books DROP COLUMN IF EXISTS review_reason;
ALTER TABLE books DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE books DROP COLUMN IF EXISTS reviewed_at;

ALTER TABLE invitation_codes DROP COLUMN IF EXISTS created_by_admin;

-- 3. 回滚 words 表变更（⚠️ 会丢失无章节模式的单词数据）
ALTER TABLE words DROP COLUMN IF EXISTS book_id;
ALTER TABLE words ALTER COLUMN chapter_id SET NOT NULL;
DROP INDEX IF EXISTS words_book_id_idx;

-- 4. 删除新增的视图
DROP VIEW IF EXISTS invitation_codes_with_creator;
DROP VIEW IF EXISTS books_pending_review;

-- 4. 删除新增的函数
DROP FUNCTION IF EXISTS is_user_banned(UUID);
DROP FUNCTION IF EXISTS auto_unban_users();
DROP FUNCTION IF EXISTS resubmit_book_for_review(UUID);
DROP FUNCTION IF EXISTS update_administrators_updated_at();
DROP FUNCTION IF EXISTS auto_approve_official_books();
```

---

## ✅ 完成

Migration 执行完成后，你将拥有：

- ✅ 完整的管理员系统（administrators + admin_audit_logs）
- ✅ 用户封禁功能
- ✅ 词库审核功能
- ✅ 管理员创建邀请码功能
- ✅ 无章节单词书支持（单词手册模式）

**下一步**: 开始开发管理后台功能！

---

**文档状态**: ✅ 已完成
**创建人**: Claude
**更新日期**: 2026-01-06
