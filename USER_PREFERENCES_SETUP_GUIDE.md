# 用户偏好设置功能 - 数据库设置指南

## 功能说明

新增全局"隐藏中文"功能，用户可以点击页面顶部的按钮，针对当前单词书保存"隐藏中文"偏好，下次访问时自动应用。

## 数据库更改

### 新增表：`user_book_preferences`

存储用户对每本书的偏好设置，包括：
- `hide_chinese`: 是否隐藏中文释义（用于自我测试）

## 执行步骤

### 方法1：通过 Supabase SQL Editor 执行（推荐）

1. 打开 Supabase Dashboard
2. 进入 SQL Editor
3. 创建新查询
4. 复制 `supabase/migrations/add_user_preferences.sql` 的内容
5. 粘贴到 SQL Editor
6. 点击"Run"执行

### 方法2：通过 psql 命令行执行

```bash
psql -h db.xxx.supabase.co -U postgres -d postgres -f supabase/migrations/add_user_preferences.sql
```

输入密码后即可执行。

## 验证是否成功

执行以下查询验证表是否创建成功：

```sql
-- 检查表是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'user_book_preferences';

-- 查看表结构
\d user_book_preferences
```

应该能看到 `user_book_preferences` 表及其字段。

## 功能测试

1. 访问单词书详情页
2. 点击右上角"隐藏中文"按钮
3. 观察所有单词卡片的中文内容是否隐藏
4. 刷新页面，设置应该保留
5. 点击"显示中文"恢复显示

## 注意事项

- 该设置是**用户级别 + 书籍级别**的
- 不同用户对同一本书可以有不同设置
- 同一用户对不同书籍的设置互相独立
- 设置存储在 `user_book_preferences` 表中
