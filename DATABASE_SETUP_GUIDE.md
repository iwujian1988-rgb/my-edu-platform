# Supabase 数据库 Schema 执行指南

**项目信息:**
- Supabase URL: `https://snnrjnpcmdsdlyldvvps.supabase.co`
- Project Ref: `snnrjnpcmdsdlyldvvps`
- Schema 文件: `supabase/schema.sql`

---

## 🚀 方法 1: Supabase Dashboard（最简单，推荐）

### 步骤:

1. **打开 Supabase Dashboard**
   - 访问: https://supabase.com/dashboard/project/snnrjnpcmdsdlyldvvps

2. **进入 SQL Editor**
   - 左侧菜单点击: **SQL Editor** (图标是 `</>`)
   - 点击: **New query** 按钮

3. **执行 Schema**
   ```bash
   # 在项目根目录打开文件
   code supabase/schema.sql
   # 或使用任何文本编辑器打开
   ```

   - 全选文件内容 (Ctrl+A)
   - 复制 (Ctrl+C)
   - 粘贴到 SQL Editor
   - 点击右下角 **Run** 按钮 ▶️

4. **查看执行结果**
   - 成功会显示: `Success. No rows returned` (这是正常的)
   - 如有错误会显示红色错误信息

5. **验证表创建**
   - 左侧菜单点击: **Database**
   - 点击: **Tables**
   - 应该看到 12 个表:
     - books
     - chapters
     - invitation_codes
     - learning_records
     - mistakes
     - scenes
     - themes
     - users
     - user_quotas
     - vocabulary_calendar
     - word_progress
     - words

---

## 🔧 方法 2: 使用 psql 命令行（开发者推荐）

### 前置条件:
- 安装 PostgreSQL 客户端工具
  - Windows: 下载 https://www.postgresql.org/download/windows/
  - Mac: `brew install postgresql`
  - Linux: `sudo apt-get install postgresql-client`

### 步骤:

1. **获取数据库密码**
   - 访问: https://supabase.com/dashboard/project/snnrjnpcmdsdlyldvvps/settings/database
   - 找到: **Database password**
   - 点击: **Show** 并复制密码
   - 或重置为新密码

2. **执行 Schema**

   ```bash
   # 在项目根目录执行
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.snnrjnpcmdsdlyldvvps.supabase.co:5432/postgres" -f supabase/schema.sql
   ```

   替换 `[YOUR-PASSWORD]` 为你的数据库密码。

   **示例:**
   ```bash
   psql "postgresql://postgres:abc123xyz@db.snnrjnpcmdsdlyldvvps.supabase.co:5432/postgres" -f supabase/schema.sql
   ```

3. **验证执行结果**
   ```bash
   # 连接到数据库
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.snnrjnpcmdsdlyldvvps.supabase.co:5432/postgres"

   # 查看所有表
   \dt

   # 应该看到 12 个表
   ```

---

## 🛠️ 方法 3: 使用 Supabase CLI（自动化推荐）

### 步骤:

1. **安装 Supabase CLI**
   ```bash
   # npm
   npm install -g supabase

   # 或使用 brew (Mac)
   brew install supabase/tap/supabase
   ```

2. **登录 Supabase**
   ```bash
   supabase login
   # 会打开浏览器进行授权
   ```

3. **链接到项目**
   ```bash
   cd D:\claude_work\yingyu\my-edu-platform
   supabase link --project-ref snnrjnpcmdsdlyldvvps
   ```

4. **执行 Schema**
   ```bash
   # 方法 A: 直接执行 SQL 文件
   supabase db execute --file supabase/schema.sql

   # 方法 B: 使用 psql through Supabase CLI
   supabase db execute -f supabase/schema.sql
   ```

5. **验证**
   ```bash
   # 查看远程数据库表列表
   supabase db remote tables
   ```

---

## 🎯 方法 4: 使用 Node.js 脚本（无需额外工具）

### 步骤:

1. **创建执行脚本**
   ```bash
   # 在项目根目录创建脚本
   node -e "
   const { createClient } = require('@supabase/supabase-js');
   const fs = require('fs');
   const path = require('path');

   // 从 .env.local 读取配置
   require('dotenv').config({ path: '.env.local' });

   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
   );

   async function executeSchema() {
     const schema = fs.readFileSync('supabase/schema.sql', 'utf8');

     // 注意: 需要使用 service_role key 执行 DDL
     // 这里需要从 Supabase Dashboard 获取 service_role key
     console.log('请在 Dashboard 获取 service_role key');

     // 或者直接在 SQL Editor 中执行更安全
   }

   executeSchema();
   "
   ```

**注意:** 此方法需要 `service_role` key，建议使用 Dashboard SQL Editor 执行。

---

## ✅ 验证 Schema 执行成功

执行完 schema 后，运行以下验证 SQL:

### 验证 SQL 1: 检查表数量
```sql
-- 在 Supabase SQL Editor 中执行
SELECT COUNT(*) as table_count
FROM pg_tables
WHERE schemaname = 'public';

-- 应该返回: 12
```

### 验证 SQL 2: 查看所有表名
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 应该看到 12 个表
```

### 验证 SQL 3: 检查触发器
```sql
SELECT tgname as trigger_name
FROM pg_trigger
WHERE tgname LIKE 'trigger_%'
ORDER BY tgname;

-- 应该看到 4 个触发器:
-- trigger_add_to_mistakes
-- trigger_add_to_vocabulary_calendar
-- trigger_reset_daily_quota
-- trigger_sync_word_status
```

### 验证 SQL 4: 检查视图
```sql
SELECT viewname
FROM pg_views
WHERE schemaname = 'public';

-- 应该看到 1 个视图:
-- global_word_status
```

### 验证 SQL 5: 测试插入数据
```sql
-- 测试插入一条主题数据
INSERT INTO themes (name, description)
VALUES ('商务', '商务英语相关主题');

-- 查询验证
SELECT * FROM themes;

-- 应该看到刚插入的数据
-- 清理测试数据
DELETE FROM themes WHERE name = '商务';
```

---

## 🐛 常见问题排查

### 问题 1: "relation does not exist" 错误
**原因:** 表或外键引用的表不存在

**解决:** 按照依赖顺序执行，schema.sql 已按正确顺序排列

### 问题 2: "permission denied" 错误
**原因:** 使用了 anon key 而非 service_role key

**解决:** 在 Dashboard SQL Editor 中执行（自动使用管理员权限）

### 问题 3: "syntax error" 错误
**原因:** SQL 语法错误或复制时遗漏了部分内容

**解决:**
- 确保复制了完整的 schema.sql 文件
- 检查文件编码是否为 UTF-8

### 问题 4: 表创建成功但功能不工作
**原因:** 触发器或函数未创建

**解决:** 运行验证 SQL 3 检查触发器

---

## 📝 推荐执行流程

**最安全的方式:**

1. ✅ **先备份数据库**（如果已有数据）
   ```sql
   -- 在 SQL Editor 中执行
   CREATE TABLE backup_users AS SELECT * FROM users;
   -- 对其他表同样操作
   ```

2. ✅ **使用 Dashboard SQL Editor 执行**
   - 最简单
   - 自动使用管理员权限
   - 可以看到实时执行结果

3. ✅ **逐个验证**
   - 先检查表创建
   - 再检查触发器
   - 最后测试功能

---

## 🎉 执行成功后的下一步

Schema 执行成功后，您可以：

1. ✅ **导入测试数据**
   ```bash
   # 执行 seed 数据
   psql "...connection-string..." -f supabase/seed.sql
   ```

2. ✅ **开发单词状态持久化 API**
   - 创建 `/api/word-progress` 路由
   - 连接 word_progress 表

3. ✅ **实现主题/场景筛选**
   - 创建 API 查询 themes 和 scenes
   - 实现前端筛选逻辑

4. ✅ **测试全局状态同步**
   - 在词书A中标记单词
   - 切换到词书B查看状态

---

**准备好执行了吗？** 🚀

推荐从 **方法 1 (Dashboard SQL Editor)** 开始，最简单直接！

执行完成后告诉我结果，我会帮您继续下一步！
