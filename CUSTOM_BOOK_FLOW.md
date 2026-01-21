# 自定义词库功能 - 完整交互流程文档

**日期**: 2026-01-10
**功能**: 新建自定义词库 + 智能导入单词
**流程类型**: 两步式向导流程

---

## 📋 流程概览

```
用户访问页面
    ↓
[步骤1] 填写词库信息（标题、描述）
    ↓
前端验证 → 调用后端API → 创建词库
    ↓
[步骤2] 批量输入单词
    ↓
前端验证 → 调用后端API → 智能导入（调用有道API）
    ↓
显示导入结果 → 跳转到词库详情
```

---

## 🎨 前端交互流程

### 文件结构
```
src/app/library/new/page.tsx          # 页面入口（服务端组件）
src/components/NewBookClient.tsx      # 核心组件（客户端组件）
```

### 流程详解

#### 阶段0：页面初始化
**文件**: `src/app/library/new/page.tsx`

**执行逻辑**:
```typescript
// 1. 检查用户登录状态
const user = await getCurrentUser()
if (!user) {
  // 未登录 → 跳转到登录页
  redirect('/login?redirect=' + encodeURIComponent('/library/new'))
}

// 2. 已登录 → 渲染页面
return (
  <div>
    <Header>新建自定义词库</Header>
    <NewBookClient userId={user.id} />  // 传入用户ID
  </div>
)
```

**页面显示**:
- 标题: "新建自定义词库"
- 副标题: "创建你自己的专属单词书"
- 返回按钮: 返回首页

---

#### 阶段1：创建词库（Step = 'create'）

**文件**: `src/components/NewBookClient.tsx` (line 18-78)

**用户界面**:
```
┌─────────────────────────────────────┐
│  新建自定义词库                      │
├─────────────────────────────────────┤
│  词库名称：                         │
│  [_______________]                  │
│                                     │
│  简介（可选）：                     │
│  [_______________]                  │
│  [_______________]                  │
│                                     │
│         [创建词库] 按钮               │
└─────────────────────────────────────┘
```

**前端状态管理**:
```typescript
const [step, setStep] = useState<Step>('create')  // 当前步骤
const [title, setTitle] = useState('')             // 词库名称
const [description, setDescription] = useState('') // 简介
const [bookId, setBookId] = useState<string>('')   // 创建后返回的ID
const [loading, setLoading] = useState(false)      // 加载状态
const [error, setError] = useState('')             // 错误消息
const [success, setSuccess] = useState('')         // 成功消息
```

**用户操作流程**:
```typescript
// 1. 用户填写表单
用户输入标题: "我的四级单词"
用户输入简介: "准备四级考试"

// 2. 用户点击"创建词库"按钮
触发: handleCreateBook(event)

// 3. 前端验证
if (!title || title.trim().length === 0) {
  显示错误: "词库名称不能为空"
  return
}

// 4. 调用后端API
fetch('/api/books', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title, description })
})

// 5. 等待响应
loading = true → 显示加载中...

// 6. 处理响应
成功:
  → bookId = data.book.id
  → 显示成功消息: "词库创建成功！"
  → 1.5秒后自动跳转到步骤2

失败:
  → 显示错误: data.error
  → loading = false
```

**前端输入验证**:
- ✅ 标题不能为空
- ❌ 没有长度限制（依赖后端）
- ❌ 没有格式验证

---

#### 阶段2：智能导入单词（Step = 'import'）

**文件**: `src/components/NewBookClient.tsx` (line 38-46, 80-150)

**用户界面**:
```
┌─────────────────────────────────────┐
│  添加单词                            │
├─────────────────────────────────────┤
│  每日配额：123/500                   │
│  ┌─────────────────────────────────┐ │
│  │ apple                           │ │
│  │ banana                          │ │
│  │ orange                          │ │
│  └─────────────────────────────────┘ │
│                                     │
│  [ + 添加单词 ]  [ 开始导入 ]        │
└─────────────────────────────────────┘
```

**前端状态管理**:
```typescript
const [wordInput, setWordInput] = useState('')      // 单词输入框
const [words, setWords] = useState<string[]>([])    // 已添加的单词列表
const [quota, setQuota] = useState({                 // 配额信息
  used: 0,
  remaining: 500,
  limit: 500
})
const [importResults, setImportResults] = useState([]) // 导入结果
```

**初始化逻辑**（进入步骤2时）:
```typescript
useEffect(() => {
  if (step === 'import') {
    // 获取今日配额
    fetch('/api/smart-import')
      .then(res => res.json())
      .then(data => setQuota(data))
  }
}, [step])
```

**用户操作流程**:

##### 操作1：添加单词
```typescript
// 1. 用户在输入框输入单词
支持多种格式：
  - 单个单词: "apple"
  - 多个单词（换行）:
    apple
    banana
    orange
  - 多个单词（逗号）: "apple, banana, orange"
  - 多个单词（空格）: "apple banana orange"

// 2. 用户点击"+ 添加单词"按钮
触发: handleAddWord()

// 3. 前端处理
const splitWords = wordInput
  .split(/[\n,\s]+/)        // 支持换行、逗号、空格分隔
  .map(w => w.trim())       // 去除空格
  .filter(w => w.length > 0) // 过滤空字符串

// 4. 去重检查
const newWords = splitWords.filter(w => !words.includes(w))
const duplicateWords = splitWords.filter(w => words.includes(w))

// 5. 更新单词列表
setWords([...words, ...newWords])
setWordInput('') // 清空输入框

// 6. 显示提示
如果有重复:
  "添加了 3 个单词，2 个重复已跳过"
如果没有:
  不显示错误
```

##### 操作2：移除单词
```typescript
// 用户点击单词旁边的 X 按钮
触发: handleRemoveWord(index)

setWords(words.filter((_, i) => i !== index))
```

##### 操作3：开始智能导入
```typescript
// 1. 用户点击"开始导入"按钮
触发: handleSmartImport()

// 2. 前端验证
if (words.length === 0) {
  显示错误: "请先添加单词"
  return
}

if (!bookId) {
  显示错误: "词库ID缺失"
  return
}

// 3. 配额检查
if (quota && words.length > quota.remaining) {
  显示错误: "超过每日配额限制！剩余：123，请求：150"
  return
}

// 4. 调用后端API
const response = await fetch('/api/smart-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ words, bookId })
})

// 5. 处理响应
成功 (200 OK):
  → 显示导入结果
  → 跳转到词库详情页

失败 (4xx/5xx):
  → 显示错误: data.error
```

---

#### 阶段3：导入结果（Step = 'success'）

**用户界面**:
```
┌─────────────────────────────────────┐
│  ✓ 导入成功！                        │
├─────────────────────────────────────┤
│  成功导入 150 个单词                  │
│  剩余配额：350/500                    │
│                                     │
│     [查看词库] 按钮                   │
└─────────────────────────────────────┘
```

---

## 🔧 后端处理流程

### API 1: 创建词库
**路由**: `POST /api/books`
**文件**: `src/app/api/books/route.ts` (line 80-138)

#### 请求流程图
```
前端请求
    ↓
[验证] 用户认证检查
    ↓
[验证] 必填字段检查
    ↓
[处理] 生成封面颜色（随机）
    ↓
[数据库] 插入books表
    ↓
[响应] 返回创建的词库信息
```

#### 详细处理逻辑

**步骤1：用户认证**
```typescript
const user = await getCurrentUser()

if (!user) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}
```

**步骤2：解析请求体**
```typescript
const body = await request.json()
const { title, description, cover_color } = body
```

**步骤3：输入验证**
```typescript
// 验证必填字段
if (!title || title.trim().length === 0) {
  return NextResponse.json(
    { error: '词库名称不能为空' },
    { status: 400 }
  )
}
```

**步骤4：生成封面颜色**
```typescript
const colors = [
  'from-green-400 to-green-500',
  'from-blue-400 to-blue-500',
  'from-purple-400 to-purple-500',
  'from-orange-400 to-orange-500',
  'from-pink-400 to-pink-500',
  'from-teal-400 to-teal-500'
]
const selectedColor = cover_color || colors[Math.floor(Math.random() * colors.length)]
```

**步骤5：插入数据库**
```typescript
const { data: book, error } = await supabase
  .from('books')
  .insert({
    title: title.trim(),
    description: description?.trim() || '',
    cover_color: selectedColor,
    category: 'custom',        // 自定义词库
    is_official: false,        // 非官方词库
    total_words: 0,            // 初始单词数为0
    total_chapters: 0,         // 初始章节数为0
    created_by: user.id        // ✅ 设置创建者（关键）
  } as any)
  .select()
  .single()
```

**数据库表结构（books）**:
```sql
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  cover_color VARCHAR(50),
  category VARCHAR(20),        -- 'custom' | 'official'
  is_official BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  total_words INTEGER DEFAULT 0,
  total_chapters INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

**步骤6：返回响应**
```typescript
成功 (200 OK):
{
  "success": true,
  "book": {
    "id": "796773be-7b77-46e2-b07c-1907ed9f3656",
    "title": "我的四级单词",
    "description": "准备四级考试",
    "cover_color": "from-blue-400 to-blue-500",
    "category": "custom",
    "is_official": false,
    "total_words": 0,
    "total_chapters": 0,
    "created_by": "7078b0aa-d06a-4209-b669-1a0d4985c8ea",
    "created_at": "2026-01-10T...",
    "updated_at": "2026-01-10T..."
  }
}

失败 (400 Bad Request):
{ "error": "词库名称不能为空" }

失败 (500 Internal Server Error):
{ "error": "创建词库失败" }
```

---

### API 2: 智能导入单词
**路由**: `POST /api/smart-import`
**文件**: `src/app/api/smart-import/route.ts` (line 9-325)

#### 请求流程图
```
前端请求
    ↓
[验证1] 用户认证
    ↓
[验证2] 单词列表非空
    ↓
[验证3] bookId非空
    ↓
[验证4] 单词数量限制（≤100）
    ↓
[验证5] 单词去重
    ↓
[验证6] 单词格式验证
    ↓
[安全检查1] bookId存在性
    ↓
[安全检查2] 用户权限（created_by）
    ↓
[安全检查3] 官方词库禁止导入
    ↓
[配额检查] 每日500词限制
    ↓
[三方API] 调用有道词典API（批次处理）
    ↓
[数据库] 检查/创建章节
    ↓
[数据库] 批量插入单词
    ↓
[数据库] 更新词库统计
    ↓
[数据库] 更新配额
    ↓
[响应] 返回导入结果
```

#### 详细处理逻辑

**步骤1：用户认证**
```typescript
const user = await getCurrentUser()

if (!user) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}
```

**步骤2-3：解析请求**
```typescript
const body = await request.json()
const { words, bookId } = body
```

**步骤4：输入验证 - 单词列表**
```typescript
// 验证4.1：非空检查
if (!Array.isArray(words) || words.length === 0) {
  return NextResponse.json(
    { error: '单词列表不能为空' },
    { status: 400 }
  )
}

// 验证4.2：数量限制
const MAX_WORDS_PER_IMPORT = 100
if (words.length > MAX_WORDS_PER_IMPORT) {
  return NextResponse.json({
    error: `每次最多导入${MAX_WORDS_PER_IMPORT}个单词`,
    requested: words.length,
    limit: MAX_WORDS_PER_IMPORT
  }, { status: 400 })
}

// 验证4.3：去重
const uniqueWords = [...new Set(words.map(w => w.trim()).filter(w => w.length > 0))]
if (uniqueWords.length !== words.length) {
  return NextResponse.json({
    error: `单词列表包含重复，已自动去重为${uniqueWords.length}个`,
    original: words.length,
    unique: uniqueWords.length
  }, { status: 400 })
}

// 验证4.4：格式验证（只允许字母和连字符）
const wordRegex = /^[a-zA-Z\-]+$/
const invalidWords = uniqueWords.filter(w => !wordRegex.test(w))
if (invalidWords.length > 0) {
  return NextResponse.json({
    error: '单词格式不正确，只允许英文字母和连字符(-)',
    invalidWords: invalidWords.slice(0, 5) // 只显示前5个
  }, { status: 400 })
}
```

**步骤5：安全检查 - bookId权限**
```typescript
// 安全检查5.1：验证bookId存在性
const { data: book, error: bookError } = await supabase
  .from('books')
  .select('id, created_by, is_official, total_words, total_chapters')
  .eq('id', bookId)
  .single()

if (bookError || !book) {
  return NextResponse.json(
    { error: '词库不存在' },
    { status: 404 }
  )
}

// 安全检查5.2：验证用户权限
const bookData = book as any
if (bookData.is_official === false && bookData.created_by !== user.id) {
  return NextResponse.json({
    error: '您只能给自己的词库添加单词'
  }, { status: 403 })
}

// 安全检查5.3：官方词库不允许智能导入
if (bookData.is_official === true) {
  return NextResponse.json({
    error: '官方词库不支持智能导入'
  }, { status: 403 })
}
```

**步骤6：配额检查**
```typescript
// 配额检查6.1：获取今日已使用配额
const todayStr = new Date().toISOString().split('T')[0]

const { data: quotaData } = await supabase
  .from('smart_import_quota')
  .select('count')
  .eq('user_id', user.id)
  .eq('quota_date', todayStr)
  .maybeSingle()

const todayUsed = (quotaData as any)?.count || 0
const DAILY_LIMIT = 500

// 配额检查6.2：验证是否超限
if (todayUsed + uniqueWords.length > DAILY_LIMIT) {
  return NextResponse.json({
    error: '超过每日配额限制',
    remaining: DAILY_LIMIT - todayUsed,
    requested: uniqueWords.length
  }, { status: 429 })
}
```

**步骤7：调用有道词典API**
```typescript
const results = []
const API_TIMEOUT = 5000      // 5秒超时
const MAX_CONCURRENT = 10     // 最多并发10个请求

// 分批处理
for (let i = 0; i < uniqueWords.length; i += MAX_CONCURRENT) {
  const batch = uniqueWords.slice(i, i + MAX_CONCURRENT)

  // 并发调用API
  const batchResults = await Promise.allSettled(
    batch.map(async (word) => {
      try {
        // 超时控制
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

        // 调用有道API
        const response = await fetch(
          `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`,
          {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; EducationalApp/1.0)'
            }
          }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`API返回${response.status}`)
        }

        const data = await response.json()

        // 验证响应结构
        if (!data || typeof data !== 'object') {
          throw new Error('API返回格式错误')
        }

        // 解析数据
        const simple = data.simple?.word?.[0]
        const ec = data.ec?.word?.[0]
        const ee = data.ee?.word?.[0]

        return {
          word: word.trim(),
          phonetic: (simple?.usphone || simple?.ukphone || '').replace(/\//g, ''),
          definition: ec?.trs?.[0]?.tr?.[0]?.l?.i?.[0] || '',
          definition_en: ee?.trs?.[0]?.tr?.[0]?.l?.i || '',
          collocation: data.phrs?.phrs?.[0]?.phr?.trs?.[0]?.tr?.[0]?.l?.i || '',
          collocation_en: data.phrs?.phrs?.[0]?.phr?.headword?.l?.i || '',
          example_sentence: data.blng_sents_part?.['sentence-pair']?.[0]?.['sentence-translation'] || '',
          example_sentence_en: data.blng_sents_part?.['sentence-pair']?.[0]?.sentence || '',
          part_of_speech: data.syno?.synos?.[0]?.syno?.pos || '',
          success: true
        }
      } catch (error: any) {
        console.error(`Error fetching word "${word}":`, error.message)
        return {
          word: word.trim(),
          phonetic: '',
          definition: '',
          definition_en: '',
          collocation: '',
          collocation_en: '',
          example_sentence: '',
          example_sentence_en: '',
          part_of_speech: '',
          success: false
        }
      }
    })
  )

  // 收集成功的结果
  batchResults.forEach(result => {
    if (result.status === 'fulfilled') {
      results.push(result.value)
    }
  })
}
```

**有道API响应示例**:
```json
{
  "simple": {
    "word": [{
      "usphone": "/ˈæpl/",
      "ukphone": "/ˈæpl/"
    }]
  },
  "ec": {
    "word": [{
      "trs": [{
        "tr": [{
          "l": {
            "i": ["n. 苹果；苹果公司"]
          }
        }]
      }]
    }]
  },
  "ee": {
    "word": [{
      "trs": [{
        "tr": [{
          "l": {
            "i": "A round fruit with red or green skin and firm white flesh."
          }
        }]
      }]
    }]
  }
}
```

**步骤8：检查/创建章节**
```typescript
// 检查是否已有章节
const { data: existingChapter } = await supabase
  .from('chapters')
  .select('id')
  .eq('book_id', bookId)
  .order('created_at', { ascending: false })
  .limit(1)

let chapterId = existingChapter?.[0]?.id

if (!chapterId) {
  // 创建默认章节
  const { data: chapterData, error: chapterError } = await supabase
    .from('chapters')
    .insert({
      book_id: bookId,
      title: '默认章节',
      order_index: 1,
      word_count: results.length
    } as any)
    .select()
    .single()

  if (chapterError || !chapterData) {
    return NextResponse.json(
      { error: '创建章节失败' },
      { status: 500 }
    )
  }

  chapterId = (chapterData as any).id
}
```

**步骤9：批量插入单词**
```typescript
const wordsToInsert = results.map((result, index) => ({
  chapter_id: chapterId,
  word: result.word,
  phonetic: result.phonetic,
  definition: result.definition,
  definition_en: result.definition_en,
  collocation: result.collocation,
  collocation_en: result.collocation_en,
  example_sentence: result.example_sentence,
  example_sentence_en: result.example_sentence_en,
  part_of_speech: result.part_of_speech,
  order_index: bookData.total_words + index + 1
}))

const { data: insertedWords, error: insertError } = await supabase
  .from('words')
  .insert(wordsToInsert as any)
  .select()

if (insertError) {
  return NextResponse.json(
    { error: '保存单词失败' },
    { status: 500 }
  )
}
```

**步骤10：更新词库统计**
```typescript
const newTotalWords = bookData.total_words + results.length
const newTotalChapters = 1

await supabase
  .from('books')
  .update({
    total_words: newTotalWords,
    total_chapters: newTotalChapters,
    is_published: true  // ✅ 自动发布，让用户能看到
  })
  .eq('id', bookId)
```

**步骤11：更新配额**
```typescript
const { error: quotaUpdateError } = await supabase
  .from('smart_import_quota')
  .upsert({
    user_id: user.id,
    count: todayUsed + uniqueWords.length,
    quota_date: todayStr,
    updated_at: new Date().toISOString()
  } as any, {
    onConflict: 'user_id,quota_date'
  })

if (quotaUpdateError) {
  console.error('Error updating quota:', quotaUpdateError)
  // ⚠️ 注意：配额更新失败不影响操作，但应该记录日志
}
```

**步骤12：返回响应**
```typescript
成功 (200 OK):
{
  "success": true,
  "words": [
    {
      "id": "word-uuid-1",
      "word": "apple",
      "phonetic": "ˈæpl",
      "definition": "n. 苹果；苹果公司",
      "definition_en": "A round fruit...",
      ...
    }
  ],
  "remaining": 350  // 剩余配额
}

失败 (400 Bad Request):
{ "error": "单词列表不能为空" }
{ "error": "每次最多导入100个单词" }
{ "error": "单词格式不正确，只允许英文字母和连字符(-)" }

失败 (403 Forbidden):
{ "error": "您只能给自己的词库添加单词" }
{ "error": "官方词库不支持智能导入" }

失败 (404 Not Found):
{ "error": "词库不存在" }

失败 (429 Too Many Requests):
{
  "error": "超过每日配额限制",
  "remaining": 123,
  "requested": 150
}

失败 (500 Internal Server Error):
{ "error": "创建章节失败" }
{ "error": "保存单词失败" }
```

---

## 🗄️ 数据库表结构

### books 表
```sql
CREATE TABLE books (
  id                  UUID PRIMARY KEY,
  title               VARCHAR(100) NOT NULL,
  description         TEXT,
  cover_color         VARCHAR(50),
  category            VARCHAR(20),      -- 'custom' | 'official'
  is_official         BOOLEAN DEFAULT false,
  is_published        BOOLEAN DEFAULT false,
  total_words         INTEGER DEFAULT 0,
  total_chapters      INTEGER DEFAULT 0,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
)

-- 索引
CREATE INDEX idx_books_created_by ON books(created_by);
CREATE INDEX idx_books_is_published ON books(is_published);
CREATE INDEX idx_books_category ON books(category);
```

### chapters 表
```sql
CREATE TABLE chapters (
  id              UUID PRIMARY KEY,
  book_id         UUID REFERENCES books(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  order_index     INTEGER NOT NULL,
  word_count      INTEGER DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW()
)

-- 索引
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
```

### words 表
```sql
CREATE TABLE words (
  id                    UUID PRIMARY KEY,
  chapter_id            UUID REFERENCES chapters(id) ON DELETE CASCADE,
  word                  VARCHAR(100) NOT NULL,
  phonetic              VARCHAR(50),
  definition            TEXT,
  definition_en         TEXT,
  collocation           TEXT,
  collocation_en        TEXT,
  example_sentence      TEXT,
  example_sentence_en   TEXT,
  part_of_speech        VARCHAR(20),
  order_index           INTEGER NOT NULL,
  created_at            TIMESTAMP DEFAULT NOW()
)

-- 索引
CREATE INDEX idx_words_chapter_id ON words(chapter_id);
CREATE INDEX idx_words_word ON words(word);
```

### smart_import_quota 表
```sql
CREATE TABLE smart_import_quota (
  id          UUID PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id),
  quota_date  DATE NOT NULL,
  count       INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, quota_date)
)

-- 索引
CREATE INDEX idx_quota_user_date ON smart_import_quota(user_id, quota_date);
```

---

## 🔐 安全检查清单

### 前端安全
- ✅ 用户登录检查（服务端组件）
- ⚠️ 输入验证有限（依赖后端）
- ❌ 没有XSS防护（依赖React默认转义）

### 后端安全
- ✅ 用户认证（getCurrentUser）
- ✅ 权限检查（created_by === user.id）
- ✅ 输入验证（数量、格式、去重）
- ✅ bookId存在性验证
- ✅ 官方词库保护
- ✅ 配额系统
- ✅ 三方API超时控制
- ✅ 并发限制
- ⚠️ 响应数据未清洗（中等风险）
- ⚠️ 配额更新失败可绕过（中等风险）

---

## 📊 流程总结

### 时间估算（100个单词）
```
步骤1：创建词库        ~200ms
步骤2：前端添加单词     <1ms
步骤3：智能导入         ~5-10s（取决于有道API速度）
  - 批次处理：10批次
  - 每批次：500ms-1s
  - 数据库操作：~100ms
总耗时：~5-10秒
```

### 成本分析
```
有道API成本：免费（无官方配额限制，但建议限制）
数据库成本：
  - 100个单词
  - 1个章节
  - 1个词库记录
  总计：~10KB存储空间
```

### 性能指标
```
并发能力：10个API调用并发
超时控制：5秒/请求
错误容忍：部分失败不影响其他
批次大小：10个单词/批次
最大单次：100个单词
```

---

## 🎯 用户体验优化建议

### 已实现 ✅
- 两步式向导流程清晰
- 实时配额显示
- 支持多种分隔符输入
- 自动去重
- 部分成功容忍

### 可优化 💡
- 添加进度条（导入时）
- 显示导入速度
- 支持取消导入
- 添加历史记录
- 支持导出单词列表
- 添加单词预览功能

---

**文档完成时间**: 2026-01-10
**流程版本**: v2.0（已修复安全漏洞）
**状态**: ✅ 生产可用
