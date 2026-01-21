# "新建自定义词库"功能 - 安全Review报告

**日期**: 2026-01-10
**Review范围**: 新建自定义词库功能（创建、智能导入）
**严重性**: 发现多个安全漏洞和bug

---

## 🔴 严重安全漏洞

### 漏洞1：用户可以给其他人的词库添加单词 🔴 P0

**位置**: `src/app/api/smart-import/route.ts` line 18-26

**问题代码**:
```typescript
const { words, bookId } = body

if (!Array.isArray(words) || words.length === 0) {
  return NextResponse.json({ error: '单词列表不能为空' }, { status: 400 })
}

if (!bookId) {
  return NextResponse.json({ error: '词库ID不能为空' }, { status: 400 })
}
```

**问题**:
- ❌ 只检查了`bookId`是否存在
- ❌ **没有检查用户是否是词库的创建者**
- ❌ 用户A可以通过修改`bookId`参数，给用户B的词库添加单词

**攻击场景**:
```
用户A创建了自己的词库
用户B获取了用户A的bookId（通过浏览器开发者工具）
用户B调用POST /api/smart-import:
  {
    "words": ["malicious", "words"],
    "bookId": "用户A的词库ID"
  }
→ 用户B成功给用户A的词库添加了恶意单词！
```

**风险等级**: 🔴 P0 - 严重安全漏洞
**影响**: 数据污染，越权写入

---

### 漏洞2：没有检查词库是否存在或已删除 🔴 P0

**位置**: `src/app/api/smart-import/route.ts` line 143-160

**问题代码**:
```typescript
// 3. 创建默认章节
const { data: chapterData, error: chapterError } = await supabase
  .from('chapters')
  .insert({
    book_id: bookId,
    title: '默认章节',
    order_index: 1,
    word_count: words.length
  } as any)
  .select()
  .single()
```

**问题**:
- ❌ 没有检查`bookId`是否存在于`books`表
- ❌ 没有检查词库是否已被删除
- ❌ 用户可以传入任意`bookId`，创建孤儿章节

**攻击场景**:
```
用户B传入不存在的bookId
→ 系统创建了一个指向不存在词库的章节
→ 数据完整性被破坏
```

**风险等级**: 🔴 P0 - 数据完整性漏洞

---

### 漏洞3：没有检查bookId是否属于用户自己 🟡 P1

**位置**: `src/app/api/smart-import/route.ts` line 18-26

**问题**:
- 没有验证`bookId`是否属于当前用户
- 用户可以导入到其他人的自定义词库

---

## 🟡 中等风险问题

### 问题1：缺少title唯一性约束 🟡

**位置**: 数据库表结构

**问题**:
- 数据库可能没有`title UNIQUE`约束
- 同一个用户可以创建多个同名的词库
- 可能导致混淆

**影响**: 用户体验问题，数据不一致

---

### 问题2：没有限制用户创建词库的数量 🟡

**位置**: `src/app/api/books/route.ts` line 80-133

**问题**:
- ❌ 没有检查用户已创建的词库数量
- ❌ 恶意用户可以创建数千个空词库，占用资源

**攻击场景**:
```
for (let i = 0; i < 10000; i++) {
  POST /api/books { title: `词库${i}` }
}
→ 数据库被垃圾数据填满
```

**风险等级**: 🟡 中等 - 资源耗尽攻击

---

### 问题3：配额检查存在竞态条件 🟡

**位置**: `src/app/api/smart-import/route.ts` line 30-49

**问题代码**:
```typescript
// 1. 检查配额
const todayUsed = (quotaData as any)?.count || 0

if (todayUsed + words.length > DAILY_LIMIT) {
  return NextResponse.json({ error: '超过配额' }, { status: 429 })
}

// ... 导入单词 ...

// 5. 更新配额（在最后）
await supabase
  .from('smart_import_quota')
  .upsert({...})
```

**问题**:
- 检查配额和更新配额之间有时间差
- 用户可以并发多次请求绕过配额限制

**攻击场景**:
```
用户剩余配额: 10
用户同时发送5个请求，每个请求10个单词
→ 所有请求都通过检查（todayUsed=10）
→ 总共导入了50个单词，超过限制
```

**风险等级**: 🟡 中等 - 配额绕过

---

### 问题4：is_published默认为false 🟡

**位置**: `src/app/api/books/route.ts` line 109-123

**问题代码**:
```typescript
.insert({
  title: title.trim(),
  description: description?.trim() || '',
  cover_color: selectedColor,
  category: 'custom',
  is_official: false,
  total_words: 0,
  total_chapters: 0,
  created_by: user.id
  // ⚠️ 缺少 is_published: true
} as any)
```

**问题**:
- 创建的词库默认`is_published=false`
- 用户创建后看不到这个词库（因为GET /api/books只返回已上架的）
- 用户体验问题

---

### 问题5：错误消息泄露内部信息 🟡

**位置**: `src/app/api/smart-import/route.ts` line 157-159

**问题代码**:
```typescript
if (chapterError || !chapterData) {
  console.error('[ERROR] Failed to create chapter:', chapterError)
  return NextResponse.json({
    error: '创建章节失败: ' + (chapterError?.message || '未知错误')
  }, { status: 500 })
}
```

**问题**:
- 返回数据库错误消息`chapterError?.message`
- 可能泄露数据库结构、表名等敏感信息

**安全建议**: 使用通用错误消息

---

## 🟢 低风险问题

### 问题1：没有输入长度限制 🟢

**位置**: 前端和后端

**问题**:
- 前端限制了`title`最大100字符（line 208）
- 前端限制了`description`最大500字符（line 223）
- 但后端只检查了是否为空，没有检查长度

**影响**: 仍然受数据库约束限制，但错误消息不友好

---

### 问题2：XSS风险 🟢

**位置**: `NewBookClient.tsx`

**问题**:
- 用户输入的`title`和`description`直接显示在页面
- 虽然React默认转义，但最好在后端也做验证

---

### 问题3：并发创建章节 🟢

**位置**: `src/app/api/smart-import/route.ts` line 146-160

**问题**:
- 多次调用`/api/smart-import`会创建多个"默认章节"
- 应该检查是否已有章节，避免重复创建

---

## 🔒 缺少的安全检查

### 1. 权限检查清单

| API | 检查用户登录 | 检查created_by | 检查bookId存在 | 验证bookId所有权 |
|-----|------------|----------------|----------------|-----------------|
| POST /api/books | ✅ | ✅ (创建时设置) | ❌ | N/A |
| POST /api/smart-import | ✅ | ❌ | ❌ | ❌ |

### 2. 建议的安全检查

```typescript
// POST /api/smart-import 应该添加：

// 1. 验证用户登录 ✅ 已有

// 2. 验证bookId存在
const { data: book } = await supabase
  .from('books')
  .select('id, created_by, is_official')
  .eq('id', bookId)
  .single()

if (!book) {
  return NextResponse.json({ error: '词库不存在' }, { status: 404 })
}

// 3. 验证用户权限（只允许操作自己的词库）
if (book.is_official === false && book.created_by !== user.id) {
  return NextResponse.json({
    error: 'Forbidden: You can only import words to your own books'
  }, { status: 403 })
}

// 4. 官方词库不允许导入
if (book.is_official === true) {
  return NextResponse.json({
    error: 'Forbidden: Cannot import words to official books'
  }, { status: 403 })
}
```

---

## 🐛 其他Bug

### Bug1：total_chapters字段未更新 🐛

**位置**: `src/app/api/smart-import/route.ts` line 206-211

**问题代码**:
```typescript
// 6. 更新词库的单词总数
await supabase
  .from('books')
  .update({ total_words: words.length })
  .eq('id', bookId)
```

**问题**:
- 只更新了`total_words`
- 没有更新`total_chapters`
- 但创建了一个新章节

**建议修复**:
```typescript
await supabase
  .from('books')
  .update({
    total_words: words.length,
    total_chapters: 1 // 因为创建了默认章节
  })
  .eq('id', bookId)
```

---

### Bug2：多次导入会创建多个"默认章节" 🐛

**位置**: `src/app/api/smart-import/route.ts` line 146-160

**问题**:
- 每次导入都会创建新的"默认章节"
- 应该检查是否已有章节，复用或创建新章节

---

### Bug3：配额更新失败不影响操作 🐛

**位置**: `src/app/api/smart-import/route.ts` line 190-204

**问题代码**:
```typescript
if (quotaUpdateError) {
  console.error('Error updating quota:', quotaUpdateError)
}
// 不影响操作，继续返回成功
```

**问题**:
- 配额更新失败，但操作仍然成功
- 用户可以无限期地免费导入
- 配额系统形同虚设

**建议**: 如果配额更新失败，应该回滚操作或返回错误

---

## 📊 统计总结

### 严重性分布

| 严重性 | 数量 | 问题 |
|--------|------|------|
| 🔴 P0 | 3 | 越权写入、数据完整性、权限检查缺失 |
| 🟡 P1 | 5 | 配额绕过、资源耗尽、用户体验 |
| 🟢 P2 | 4 | 输入验证、并发问题 |

### 按类别分布

| 类别 | 数量 |
|------|------|
| 安全漏洞 | 7 |
| Bug | 3 |
| 数据完整性 | 2 |
| 用户体验 | 3 |

---

## ✅ 修复优先级

### 立即修复（P0）

1. **添加bookId权限检查** - 防止越权写入
2. **验证bookId存在性** - 保护数据完整性
3. **修复total_chapters字段** - 修复数据不一致

### 尽快修复（P1）

4. **添加创建词库数量限制** - 防止资源耗尽
5. **修复配额竞态条件** - 使用数据库事务或原子操作
6. **设置is_published默认值** - 改善用户体验
7. **通用化错误消息** - 防止信息泄露

### 后续优化（P2）

8. **添加title唯一性约束** - 防止重复
9. **优化章节创建逻辑** - 避免重复章节
10. **增强输入验证** - 后端长度验证

---

## 🎯 关键修复代码

### 修复1：添加权限检查（最重要）

```typescript
// POST /api/smart-import
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { words, bookId } = body

    // ✅ 新增：验证bookId存在
    const { data: book } = await supabase
      .from('books')
      .select('id, created_by, is_official')
      .eq('id', bookId)
      .single()

    if (!book) {
      return NextResponse.json({ error: '词库不存在' }, { status: 404 })
    }

    // ✅ 新增：验证用户权限
    const bookData = book as any
    if (bookData.is_official === false && bookData.created_by !== user.id) {
      return NextResponse.json({
        error: 'Forbidden: You can only import words to your own books'
      }, { status: 403 })
    }

    // ✅ 新增：官方词库不允许导入
    if (bookData.is_official === true) {
      return NextResponse.json({
        error: 'Forbidden: Cannot import words to official books'
      }, { status: 403 })
    }

    // 继续原有逻辑...
  }
}
```

### 修复2：修复total_chapters

```typescript
// 6. 更新词库统计
await supabase
  .from('books')
  .update({
    total_words: words.length,
    total_chapters: 1 // ✅ 修复：更新章节数
  })
  .eq('id', bookId)
```

### 修复3：添加创建词库数量限制

```typescript
// POST /api/books
export async function POST(request: Request) {
  const user = await getCurrentUser()
  // ...

  // ✅ 新增：检查用户的词库数量
  const { data: existingBooks, error: countError } = await supabase
    .from('books')
    .select('id', { count: 'exact' })
    .eq('created_by', user.id)
    .eq('is_official', false)

  const MAX_CUSTOM_BOOKS = 100
  if ((existingBooks || []).length >= MAX_CUSTOM_BOOKS) {
    return NextResponse.json({
      error: `您已达到最大词库数量限制（${MAX_CUSTOM_BOOKS}个）`
    }, { status: 403 })
  }

  // 继续创建...
}
```

---

## 📝 Review结论

### 安全性评分：⭐⭐ (2/5)

**优点**:
- ✅ 所有API都检查了用户登录
- ✅ 创建词库时正确设置了created_by
- ✅ 配额系统已实现

**缺点**:
- ❌ **缺少关键的权限检查**（越权写入）
- ❌ 数据完整性验证不足
- ❌ 存在竞态条件
- ❌ 错误消息可能泄露信息

### 建议行动

1. **立即修复P0漏洞**（越权写入、数据完整性）
2. **添加全面的权限检查**
3. **修复Bug（total_chapters等）**
4. **进行安全测试**
5. **代码review后再部署**

---

**Review完成时间**: 2026-01-10
**Review状态**: ❌ 发现多个严重漏洞，不建议部署
**修复状态**: ⏳ 待修复
**优先级**: 🔴 P0 - 立即修复
