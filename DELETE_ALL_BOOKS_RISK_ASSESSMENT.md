# 删除所有书籍 - 风险评估与数据关联分析报告

**生成时间**: 2026-01-12
**评估范围**: 删除数据库中所有书籍数据

---

## 📊 数据关联关系图

```
books (书籍)
  ├── chapters (章节) [ON DELETE CASCADE]
  │     └── words (单词) [ON DELETE CASCADE]
  │           ├── word_progress (学习进度) [ON DELETE CASCADE]
  │           ├── learning_records (学习记录) [ON DELETE CASCADE]
  │           ├── mistakes (错题本) [ON DELETE CASCADE]
  │           └── vocabulary_calendar (生词日历) [ON DELETE CASCADE]
  │
  ├── word_progress (学习进度) [ON DELETE CASCADE]
  ├── learning_records (学习记录) [ON DELETE CASCADE]
  ├── mistakes (错题本) [ON DELETE CASCADE]
  ├── vocabulary_calendar (生词日历) [ON DELETE CASCADE]
  └── user_book_preferences (用户偏好设置) [ON DELETE CASCADE]
```

---

## ⚠️ 风险评估

### 🔴 高风险影响

#### 1. **用户学习数据完全丢失**
- **影响范围**: 所有用户
- **数据内容**:
  - 学习进度 (word_progress)
  - 学习记录 (learning_records)
  - 错题本 (mistakes)
  - 生词日历 (vocabulary_calendar)
  - 用户偏好设置 (user_book_preferences)

#### 2. **不可逆的数据删除**
- 由于外键约束使用了 `ON DELETE CASCADE`
- 删除书籍会自动级联删除所有关联数据
- **无法撤销**

#### 3. **用户体验影响**
- 用户打开应用会看到空白的学习进度
- 错题本会被清空
- 学习统计数据会丢失
- 生词日历热力图会清空

### 🟢 保留的数据（不受影响）

#### 1. **用户账户信息**
- ✅ users 表（用户账号、登录信息）
- ✅ user_quotas（用户配额）
- ✅ invitation_codes（邀请码）
- ✅ administrators（管理员）

#### 2. **分类数据**
- ✅ themes（主题）
- ✅ scenes（场景）

---

## 📋 当前环境数据统计

### 需要确认的数据量

请运行以下统计查询来了解即将删除的数据量：

```sql
-- 1. 统计书籍数量
SELECT COUNT(*) as total_books FROM books;

-- 2. 统计章节数量
SELECT COUNT(*) as total_chapters FROM chapters;

-- 3. 统计单词数量
SELECT COUNT(*) as total_words FROM words;

-- 4. 统计用户学习进度记录数
SELECT COUNT(*) as total_word_progress FROM word_progress;

-- 5. 统计学习记录数
SELECT COUNT(*) as total_learning_records FROM learning_records;

-- 6. 统计错题本记录数
SELECT COUNT(*) as total_mistakes FROM mistakes;

-- 7. 统计生词日历记录数
SELECT COUNT(*) as total_vocabulary_calendar FROM vocabulary_calendar;

-- 8. 统计用户偏好设置数
SELECT COUNT(*) as total_user_preferences FROM user_book_preferences;

-- 9. 按用户统计学习进度分布
SELECT user_id, COUNT(*) as progress_count
FROM word_progress
GROUP BY user_id
ORDER BY progress_count DESC;
```

---

## 🛡️ 安全删除方案

### 方案 A：完全删除（推荐用于正式环境导入）

**适用场景**: 确认要导入全新的正式数据，不需要保留任何旧数据

**删除顺序**: 从最底层的依赖表开始删除，避免外键约束问题

```sql
-- ⚠️ 警告：此操作不可逆！请在执行前备份！

-- 步骤 1: 删除用户偏好设置
DELETE FROM user_book_preferences;

-- 步骤 2: 删除生词日历
DELETE FROM vocabulary_calendar;

-- 步骤 3: 删除错题本
DELETE FROM mistakes;

-- 步骤 4: 删除学习记录
DELETE FROM learning_records;

-- 步骤 5: 删除学习进度
DELETE FROM word_progress;

-- 步骤 6: 删除单词（会自动级联删除相关学习数据）
DELETE FROM words;

-- 步骤 7: 删除章节（会自动级联删除相关单词）
DELETE FROM chapters;

-- 步骤 8: 删除书籍（会自动级联删除章节、单词等）
DELETE FROM books;
```

### 方案 B：保留用户数据，仅删除内容（不推荐）

**适用场景**: 想要保留用户学习数据，但仅替换书籍内容
**风险**: 可能导致孤儿数据（引用了不存在的书籍/单词）
**不推荐原因**: 数据完整性无法保证

---

## ✅ 删除前检查清单

### 1. 数据备份（必须）
- [ ] 备份整个数据库
- [ ] 导出关键数据到CSV/JSON（可选）
- [ ] 记录当前书籍列表

### 2. 环境确认
- [ ] 确认当前是开发/测试环境（不是生产环境）
- [ ] 确认没有用户正在使用系统
- [ ] 确认新数据已准备好可以导入

### 3. 通知相关人员
- [ ] 通知开发团队
- [ ] 通知测试人员（如果有）
- [ ] 确认没有正在进行的测试

---

## 🔧 执行步骤

### 准备阶段

1. **运行数据统计**（了解要删除什么）
2. **备份数据库**（以防万一）
3. **确认新数据准备完毕**

### 执行阶段

1. **停用应用访问**（可选，防止用户在删除过程中操作）
2. **执行删除脚本**
3. **验证删除结果**

### 导入阶段

1. **导入新书籍数据**
2. **验证数据完整性**
3. **测试应用功能**

---

## 📝 删除脚本

### 完整删除脚本（已包含数据验证）

见文件：`delete-all-books.sql`

---

## 🚨 回滚方案

### 如果删除后发现错误

1. **立即停止应用**
2. **从备份恢复数据库**
3. **验证恢复结果**
4. **分析错误原因**
5. **重新执行删除**

---

## 📌 注意事项

1. **CASCADE 删除**: 所有外键都有 `ON DELETE CASCADE`，删除书籍会自动删除所有关联数据
2. **不可逆**: 删除操作无法撤销，请务必备份
3. **用户影响**: 所有用户的学习进度会清空
4. **性能影响**: 删除大量数据可能需要较长时间

---

## ✨ 推荐执行方式

1. **先在测试环境验证**
2. **备份生产数据库**
3. **在维护窗口执行**（避免用户使用）
4. **执行后验证**
5. **导入新数据**
6. **全面测试**

---

## 📞 需要帮助？

如果在执行过程中遇到问题：
1. 立即停止操作
2. 检查错误日志
3. 从备份恢复
4. 分析问题原因后重新执行
