# Supabase Schema 快速执行脚本

本目录包含用于在 Supabase 中执行 database schema 的脚本和指南。

## 📁 文件说明

- `../DATABASE_SETUP_GUIDE.md` - **完整执行指南**（推荐首先阅读）
- `verify-schema.sql` - Schema 验证脚本
- `execute-schema.bat` - Windows 批处理脚本（需安装 psql）

---

## 🚀 快速开始（3种方法）

### 方法 1: Dashboard SQL Editor（最简单）⭐

1. **点击链接打开 SQL Editor**
   https://supabase.com/dashboard/project/snnrjnpcmdsdlyldvvps/sql/new

2. **执行 schema**
   ```bash
   # 在项目根目录打开文件
   supabase/schema.sql
   ```
   - 全选并复制内容 (Ctrl+A, Ctrl+C)
   - 粘贴到 SQL Editor
   - 点击 Run ▶️

3. **验证执行**
   - 复制 `verify-schema.sql` 内容
   - 粘贴到 SQL Editor
   - 点击 Run ▶️
   - 检查结果是否符合预期

---

### 方法 2: Windows 批处理脚本

```bash
# 双击运行
scripts\execute-schema.bat
```

或命令行:
```bash
cd D:\claude_work\yingyu\my-edu-platform
scripts\execute-schema.bat
```

**要求:**
- ✅ 已安装 PostgreSQL 客练端工具
- ✅ 从 Dashboard 获取数据库密码

---

### 方法 3: psql 命令行

```bash
# 替换 [YOUR-PASSWORD] 为实际密码
psql "postgresql://postgres:[YOUR-PASSWORD]@db.snnrjnpcmdsdlyldvvps.supabase.co:5432/postgres" -f supabase/schema.sql
```

---

## ✅ 验证执行成功

执行完成后，运行验证脚本:

### 通过 Dashboard
1. 打开: https://supabase.com/dashboard/project/snnrjnpcmdsdlyldvvps/sql/new
2. 复制 `verify-schema.sql` 内容
3. 粘贴并运行
4. 检查结果

### 通过 psql
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.snnrjnpcmdsdlyldvvps.supabase.co:5432/postgres" -f scripts/verify-schema.sql
```

### 预期结果
- ✅ Table Count: 12
- ✅ Trigger Count: 4
- ✅ View Count: 1
- ✅ Test INSERT: 成功

---

## 📊 应该创建的表（12个）

1. `users` - 用户表
2. `invitation_codes` - 邀请码表
3. `user_quotas` - 用户配额表
4. `themes` - 主题表
5. `scenes` - 场景表
6. `books` - 单词书表
7. `chapters` - 章节表
8. `words` - 单词表
9. `word_progress` - 单词学习进度表 ⭐
10. `learning_records` - 学习记录表
11. `mistakes` - 错题本表
12. `vocabulary_calendar` - 生词日历表

---

## 🔧 触发器（4个）

1. `trigger_add_to_mistakes` - 自动添加到错题本
2. `trigger_add_to_vocabulary_calendar` - 自动记录到生词日历
3. `trigger_reset_daily_quota` - 每日配额重置
4. `trigger_sync_word_status` - **全局单词状态同步** ⭐

---

## 🎯 视图（1个）

1. `global_word_status` - 全局单词状态映射视图

---

## ❓ 遇到问题?

### 1. 无法连接数据库
**解决:**
- 检查密码是否正确
- 检查网络连接
- 尝试使用 Dashboard SQL Editor（方法1）

### 2. 权限错误
**解决:**
- 使用 Dashboard SQL Editor 自动获得管理员权限
- 不要使用 anon key

### 3. 表已存在错误
**解决:**
- schema.sql 使用了 `CREATE TABLE IF NOT EXISTS`
- 会自动跳过已存在的表
- 这是正常的，不会影响执行

---

## 🎉 执行成功后

Schema 执行成功后，您可以:

1. ✅ **导入测试数据**
   ```bash
   # 执行 seed 数据
   psql "...connection..." -f supabase/seed.sql
   ```

2. ✅ **开始开发功能**
   - 单词状态持久化 API
   - 主题/场景筛选
   - 全局状态同步测试

3. ✅ **查看表结构**
   - Dashboard: Database > Tables
   - 点击表名查看结构

---

## 📚 更多信息

详细文档请参考:
- `DATABASE_SETUP_GUIDE.md` - 完整执行指南
- `supabase/schema.sql` - Schema 定义
- `tech_spec.md` - 技术规范

---

**准备好了吗？** 🚀

推荐使用 **方法 1 (Dashboard SQL Editor)**，最简单直接！

执行完成后告诉我，我会帮您继续下一步！
