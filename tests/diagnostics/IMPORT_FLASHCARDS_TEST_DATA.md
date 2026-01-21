# 卡片背单词测试数据导入指南

## 📋 概述

本指南用于为 `flashcards-flow.spec.ts` 提供干净的测试数据。

**测试数据包含：**
- ✅ 测试用户（test-flashcards@example.com）
- ✅ 完整权限（卡片背单词、听写、消消乐、自定义词书）
- ✅ 测试词书（20个单词，所有状态为 new）
- ✅ 用户偏好设置

---

## 🚀 快速开始

### 步骤1：创建测试用户（必需）

**方式A：通过 Supabase Dashboard 创建**
1. 访问 Supabase Dashboard
2. 进入 Authentication → Users
3. 点击 "Add user" → "Create new user"
4. 填写信息：
   - Email: `test-flashcards@example.com`
   - Password: `Test123456`
   - Auto Confirm User: ✅ 开启
5. 点击 "Create user"

**方式B：通过注册页面创建**
1. 访问 `http://localhost:3000/login`
2. 切换到"注册"标签
3. 填写信息：
   - 手机号：`18888888888`
   - 密码：`Test123456`
   - 邀请码：`TEST1234`
4. 点击注册
5. 然后手动在数据库中将该用户的 `email` 改为 `test-flashcards@example.com`

---

### 步骤2：导入测试数据

**方式A：使用 Supabase SQL Editor（推荐）**

1. 访问 Supabase Dashboard
2. 进入 SQL Editor
3. 复制 `tests/diagnostics/import-flashcards-test-data.sql` 文件内容
4. 粘贴到 SQL Editor
5. 点击 "Run" 执行

**方式B：使用命令行**

```bash
# Windows (PowerShell)
psql -h your-project.supabase.co -U postgres -d postgres -f tests/diagnostics/import-flashcards-test-data.sql

# 如果需要输入密码
psql -h your-project.supabase.co -U postgres -d postgres -W -f tests/diagnostics/import-flashcards-test-data.sql
```

---

### 步骤3：验证数据导入成功

在 Supabase SQL Editor 中执行以下查询：

```sql
-- 1. 验证词书创建
SELECT id, title, total_words, is_published
FROM books
WHERE id = '20000000-0000-0000-0000-000000000001';

-- 2. 验证单词创建（应该有20个）
SELECT COUNT(*) as word_count
FROM words
WHERE book_id = '20000000-0000-0000-0000-000000000001';

-- 3. 验证用户配置
SELECT email, full_name, feature_permissions, book_permissions
FROM users
WHERE id = '20000000-0000-0000-0000-000000000001';
```

**预期结果：**
- ✅ 词书：1行
- ✅ 单词：20行
- ✅ 用户：1行（权限包含 'flashcards', 'dictation', 'match_game', 'custom_books'）

---

## 📝 测试词书详情

**词书ID：** `20000000-0000-0000-0000-000000000001`

**词书名称：** 测试-卡片背单词专用词书

**单词列表（20个）：**

1. **基础单词（5个）：**
   - ability (n名词) - 能力，才能
   - book (n名词) - 书，书籍
   - computer (n名词) - 电脑，计算机
   - education (n名词) - 教育
   - freedom (n名词) - 自由

2. **中级单词（5个）：**
   - government (n名词) - 政府
   - happiness (n名词) - 幸福，快乐
   - knowledge (n名词) - 知识
   - language (n名词) - 语言
   - memory (n名词) - 记忆，记忆力

3. **高级单词（5个）：**
   - opportunity (n名词) - 机会，时机
   - philosophy (n名词) - 哲学
   - technology (n名词) - 技术，科技
   - understanding (n名词) - 理解，理解力
   - vocabulary (n名词) - 词汇，词汇量

4. **动词（5个）：**
   - accomplish (v动词) - 完成，实现
   - believe (v动词) - 相信，认为
   - challenge (v动词) - 挑战，质疑
   - develop (v动词) - 发展，开发
   - experience (v动词) - 经历，体验

**所有单词的初始状态：** `new`（未标注）

---

## 🧪 测试账号信息

**邮箱：** `test-flashcards@example.com`
**密码：** `Test123456`

**权限：**
- ✅ 卡片背单词 (flashcards)
- ✅ 听写模式 (dictation)
- ✅ 消消乐 (match_game)
- ✅ 自定义词库 (custom_books)
- ✅ 所有词书访问权限 (all)

**权限到期时间：** 注册后1年

---

## ⚠️ 注意事项

### 1. 用户ID一致性

如果使用注册方式创建用户，系统会自动生成UUID，需要手动更新：
```sql
-- 获取自动生成的用户ID
SELECT id, email FROM auth.users WHERE email = '18888888888@phone.xiaoyu.com';

-- 更新 public.users 表（使用实际的用户ID）
UPDATE users
SET id = '20000000-0000-0000-0000-000000000001',
    email = 'test-flashcards@example.com'
WHERE id = '自动生成的ID';
```

### 2. RLS 策略

确保以下表有正确的 RLS 策略：
- `users` 表
- `books` 表
- `words` 表
- `user_book_preferences` 表
- `word_progress` 表

### 3. 数据清理

如果需要重新导入，先删除旧数据：
```sql
-- 清理单词进度
DELETE FROM word_progress
WHERE user_id = '20000000-0000-0000-0000-000000000001'
  AND book_id = '20000000-0000-0000-0000-000000000001';

-- 清理用户偏好
DELETE FROM user_book_preferences
WHERE user_id = '20000000-0000-0000-0000-000000000001'
  AND book_id = '20000000-0000-0000-0000-000000000001';

-- 清理单词
DELETE FROM words
WHERE book_id = '20000000-0000-0000-0000-000000000001';

-- 清理词书
DELETE FROM books
WHERE id = '20000000-0000-0000-0000-000000000001';

-- 清理用户（最后）
DELETE FROM users
WHERE id = '20000000-0000-0000-0000-000000000001';
```

---

## ✅ 导入成功后的检查清单

- [ ] 测试用户创建成功
- [ ] 词书创建成功（20个单词）
- [ ] 所有单词状态为 `new`（无 word_progress 记录）
- [ ] 用户权限配置正确
- [ ] 用户偏好设置创建成功
- [ ] 可以使用测试账号登录

---

## 🔍 常见问题

### Q1：用户已存在怎么办？
```sql
-- 先删除旧用户
DELETE FROM users WHERE id = '20000000-0000-0000-0000-000000000001';
-- 然后重新导入
```

### Q2：词书已存在怎么办？
```sql
-- 删除词书及相关数据
DELETE FROM words WHERE book_id = '20000000-0000-0000-0000-000000000001';
DELETE FROM books WHERE id = '20000000-0000-0000-0000-000000000001';
```

### Q3：权限不足错误？
检查 RLS 策略，确保使用 `SERVICE_ROLE_KEY` 或管理员权限执行SQL。

---

## 📞 需要帮助？

如果遇到问题，检查：
1. Supabase 项目是否正确配置
2. 数据库迁移是否已执行
3. RLS 策略是否正确设置
4. 环境变量是否正确加载
