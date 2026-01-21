# 🧪 自定义词库管理 API 测试指南

## ✅ 环境状态

- ✅ 开发服务器：**正在运行**（端口 3000）
- ✅ 环境配置：`.env.local` 已配置
- ✅ 迁移文件：已创建
- ⚠️ 数据库迁移：**需要执行**

## 📋 测试前准备

### 1. 执行数据库迁移（必须）

```bash
# 方式一：使用 Supabase CLI（推荐）
npx supabase db push

# 方式二：手动执行 SQL
# 在 Supabase Dashboard → SQL Editor 中执行：
# supabase/migrations/20260115_add_custom_book_indexes.sql
```

迁移内容：
- ✅ 创建 3 个复合索引（性能优化）
- ✅ 添加 `is_default` 字段到 chapters 表

---

## 🚀 测试地址

### 本地开发服务器
```
http://localhost:3000
```

### API 测试端点

#### 1. 章节管理 API
```
# 获取章节列表
GET http://localhost:3000/api/books/{bookId}/chapters

# 创建章节
POST http://localhost:3000/api/books/{bookId}/chapters
Body: { "title": "新章节标题" }

# 更新章节
PUT http://localhost:3000/api/books/{bookId}/chapters/{chapterId}
Body: { "title": "更新后的标题" }

# 删除章节
DELETE http://localhost:3000/api/books/{bookId}/chapters/{chapterId}
```

#### 2. 单词管理 API
```
# 获取单词列表（表格视图）
GET http://localhost:3000/api/books/{bookId}/words?page=1&pageSize=20&chapterId={chapterId}

# 更新单词
PUT http://localhost:3000/api/words/{wordId}
Body: { "word": "example", "definition": "示例" }

# 删除单词
DELETE http://localhost:3000/api/words/{wordId}
```

#### 3. 批量操作 API
```
# 批量删除单词
POST http://localhost:3000/api/words/batch-delete
Body: { "wordIds": ["id1", "id2", "id3"] }

# 批量移动单词
POST http://localhost:3000/api/words/batch-move
Body: {
  "wordIds": ["id1", "id2"],
  "targetChapterId": "chapter-id"
}
```

#### 4. 智能导入 API
```
# 智能导入单词
POST http://localhost:3000/api/smart-import
Body: {
  "words": ["apple", "banana", "orange"],
  "bookId": "your-book-id",
  "chapterId": "optional-chapter-id"
}

# 获取今日配额
GET http://localhost:3000/api/smart-import
```

---

## 🛠️ 测试方式

### 方式一：运行单元测试（推荐）

```bash
# 运行所有单元测试
npm run test:unit

# 运行特定测试文件
npm run test:unit -- chapters.test.ts

# 带覆盖率报告
npm run test:unit:coverage

# UI 模式（图形化界面）
npm run test:unit:ui
```

### 方式二：使用 API 客户端测试

推荐工具：
- **Postman**：https://www.postman.com/
- **Insomnia**：https://insomnia.rest/
- **Thunder Client**（VS Code 插件）
- **curl**（命令行）

#### 示例：使用 curl 测试

```bash
# 1. 获取章节列表
curl http://localhost:3000/api/books/YOUR_BOOK_ID/chapters

# 2. 创建新章节
curl -X POST http://localhost:3000/api/books/YOUR_BOOK_ID/chapters \
  -H "Content-Type: application/json" \
  -d '{"title":"测试章节"}'

# 3. 批量删除单词
curl -X POST http://localhost:3000/api/words/batch-delete \
  -H "Content-Type: application/json" \
  -d '{"wordIds":["word-id-1","word-id-2"]}'
```

### 方式三：在浏览器中测试

1. 访问 http://localhost:3000
2. 登录您的账号
3. 进入"我的词库"
4. 创建或选择一个自定义词库
5. 测试以下功能：
   - ✅ 创建/编辑/删除章节
   - ✅ 查看单词列表（表格视图）
   - ✅ 编辑单词详情
   - ✅ 批量选择和删除单词
   - ✅ 批量移动单词到其他章节
   - ✅ 智能导入新单词

---

## 📝 测试检查清单

### 章节管理（16个测试点）
- [ ] 获取章节列表（升序/降序）
- [ ] 获取章节列表（包含单词数统计）
- [ ] 创建新章节（自动 order_index）
- [ ] 创建章节（标题重复检查）
- [ ] 创建章节（标题长度验证 1-50）
- [ ] 更新章节标题
- [ ] 更新章节（标题唯一性检查）
- [ ] 删除空章节
- [ ] 删除包含单词的章节（移动到默认章节）
- [ ] 删除默认章节（应该失败）
- [ ] 权限检查（非创建者不能操作）
- [ ] 官方词库（不能创建章节）

### 单词管理（测试点）
- [ ] 单词列表分页（page, pageSize）
- [ ] 按章节筛选单词
- [ ] 单词搜索（ilike 匹配）
- [ ] 单词排序（任意字段）
- [ ] 更新单词详情（13个字段）
- [ ] 删除单词（级联到 word_progress）

### 批量操作（23个测试点）
- [ ] 批量删除（最多100个）
- [ ] 批量删除（部分成功场景）
- [ ] 批量移动（全有或全无）
- [ ] 批量移动（到默认章节）
- [ ] 批量移动（不同词库检测）
- [ ] 章节单词计数自动更新

### 智能导入（17个测试点）
- [ ] 导入单词（成功场景）
- [ ] Redis 缓存命中
- [ ] 指定目标章节
- [ ] 自动创建默认章节
- [ ] 单词去重
- [ ] 单词格式验证（字母+连字符）
- [ ] 超限检查（最多100个）
- [ ] 官方词库限制
- [ ] 非创建者限制
- [ ] 每日配额检查（500词/天）
- [ ] 配额更新

---

## 🔍 调试技巧

### 查看开发服务器日志
```bash
# 如果使用 PM2
npm run pm2:logs

# 如果直接运行
# 查看控制台输出
```

### 查看数据库状态
```bash
# 连接到 Supabase
npx supabase db remote commit

# 或在 Supabase Dashboard 查看：
# - Table Editor
# - SQL Editor
# - Database Reports
```

### 常见问题

**Q: API 返回 401 Unauthorized**
- 检查是否已登录
- 检查 token 是否有效

**Q: API 返回 403 Forbidden**
- 检查是否是词库创建者
- 检查是否是官方词库

**Q: API 返回 404 Not Found**
- 检查 bookId / chapterId 是否正确
- 检查资源是否存在

**Q: 批量操作失败**
- 检查是否超过100个限制
- 检查所有单词是否属于同一词库

---

## 📊 测试覆盖率

运行以下命令查看详细覆盖率报告：

```bash
npm run test:unit:coverage
```

目标覆盖率：
- 语句覆盖率：80%+
- 分支覆盖率：75%+
- 函数覆盖率：85%+

---

## ✅ 测试完成后的检查

- [ ] 所有单元测试通过
- [ ] 测试覆盖率达到 80%+
- [ ] API 端点功能正常
- [ ] 数据库迁移已执行
- [ ] 权限控制正常
- [ ] 错误处理正确

---

## 📞 如需帮助

查看详细文档：
- API 测试指南：`CUSTOM_BOOK_API_TEST_GUIDE.md`
- 设计文档：`CUSTOM_BOOK_MANAGEMENT_DESIGN.md`

**测试愉快！🎉**
