# AI 编程防护指南

> 最后更新: 2026-03-15
> 适用范围: 所有 AI 辅助编写的代码

---

## 一、AI 编程常见问题

| # | 问题 | 表现 | 危害 |
|---|------|------|------|
| 1 | **碎片化修复** | 每次只修一个点，叠加多个 `🔧 FIX` 注释 | 代码越来越乱，难以维护 |
| 2 | **魔法数字** | `3000`, `15`, `50` 等硬编码常量 | 修改困难，语义不明 |
| 3 | **边界忽略** | 只测 happy path，不测边界情况 | 生产环境出 bug |
| 4 | **多路径逻辑** | 同一功能有 4+ 条不同的代码路径 | 行为不一致，难以测试 |
| 5 | **防御性编程错位** | 客户端做去重，而不是 API 保证一致性 | 掩盖根本问题 |
| 6 | **类型滥用** | 大量使用 `any` 类型 | 类型检查失效 |
| 7 | **错误处理不完整** | 空 catch 或静默失败 | 问题难以排查 |
| 8 | **状态不一致** | 前端 count 和后端不同 | 用户体验混乱 |

---

## 二、代码规范

### 2.1 常量提取（禁止魔法数字）

```typescript
// ❌ 禁止
queryPageSize = 3000
maxIterations: 15
if (words.length > 50) { ... }

// ✅ 必须
/**
 * 单词查询配置
 */
export const WORDS_CONFIG = {
  /** 每页单词数量 */
  PAGE_SIZE: 50,

  /** 乱序模式最大支持的单词数量 */
  MAX_WORDS_FOR_SHUFFLE: 10000,

  /** 数据库查询最大迭代次数（防止无限循环） */
  MAX_DB_QUERY_ITERATIONS: 200,

  /** 单次数据库查询超时时间（毫秒） */
  DB_QUERY_TIMEOUT_MS: 10000,

  /** 进度保存防抖延迟（毫秒） */
  PROGRESS_DEBOUNCE_MS: 1000,
} as const
```

### 2.2 类型约束（禁止 any）

```typescript
// ❌ 禁止
const words: any[] = []
function processWord(word: any) { ... }
const result = await supabase.rpc(...)  // 无类型

// ✅ 必须
interface Word {
  id: string
  word: string
  phonetic: string | null
  uk_phonetic: string | null
  us_phonetic: string | null
  definition: string
  definition_en: string | null
  example_sentence: string | null
  example_sentence_en: string | null
  collocation: string | null
  collocation_en: string | null
  part_of_speech: string | null
  chapter_id: string
  audio_url: string | null
  status?: WordStatus
}

type WordStatus = 'new' | 'unknown' | 'fuzzy' | 'known'

interface GetWordsResult {
  success: boolean
  data: Word[]
  page: number
  pageSize: number
  count: number
  total: number
}
```

### 2.3 错误处理规范

```typescript
// ❌ 禁止
try {
  // ...
} catch (error) {
  console.error('Error:', error)
}

// ✅ 必须
// 定义错误码枚举
enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  BOOK_NOT_FOUND = 'BOOK_NOT_FOUND',
  WORDS_FETCH_ERROR = 'WORDS_FETCH_ERROR',
  INVALID_PARAMS = 'INVALID_PARAMS',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

try {
  // ...
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const errorStack = error instanceof Error ? error.stack : undefined

  // 结构化日志
  logger.error('[getWords] Database query failed', {
    code: ErrorCode.WORDS_FETCH_ERROR,
    bookId,
    status,
    page,
    errorMessage,
    errorStack,
  })

  // 结构化响应
  return NextResponse.json({
    success: false,
    error: '获取单词失败，请稍后重试',
    code: ErrorCode.WORDS_FETCH_ERROR,
  }, { status: 500 })
}
```

---

## 三、单一数据流设计

### 3.1 问题示例（多路径）

```
if (RPC 可用 && status === 'all' && !shuffle)
  → 路径 A: RPC 查询

else if (status === 'new')
  → 路径 B: 特殊处理

else if (status !== 'all')
  → 路径 C: 另一种处理

else if (shuffle)
  → 路径 D: 又一种处理

❌ 问题：每条路径有不同的分页、筛选、性能特征
```

### 3.2 解决方案（统一数据流）

```typescript
/**
 * 统一的单词分页查询函数
 * 所有 status、shuffle 组合都走同一逻辑
 */
async function getWordsPaginated(params: GetWordsParams): Promise<GetWordsResult> {
  const { bookId, status, shuffle, page, pageSize } = params

  // Step 1: 获取所有匹配的 word_id（轻量查询）
  const allIds = await getMatchingWordIds(bookId, status, userId)

  // Step 2: 可选乱序（统一处理）
  const orderedIds = shuffle
    ? seededShuffle(allIds, `${bookId}-${status}`)
    : allIds

  // Step 3: 分页切片（统一处理）
  const startIndex = (page - 1) * pageSize
  const pageIds = orderedIds.slice(startIndex, startIndex + pageSize)

  // Step 4: 获取完整单词数据（统一处理）
  const words = await getWordsByIds(pageIds)

  // Step 5: 返回统一格式
  return {
    success: true,
    data: words,
    page,
    pageSize,
    count: orderedIds.length,  // 匹配条件的总数
    total: bookTotalWords,     // 整本书总数
  }
}
```

---

## 四、边界条件检查清单

每次编写或修改代码时，必须检查以下边界条件：

| # | 边界条件 | 测试方法 | 期望行为 |
|---|---------|---------|---------|
| 1 | 空数据 | 新用户/空词书 | 返回 `data: [], count: 0` |
| 2 | 页码为 0 | `page=0` | 返回第一页或空数组 |
| 3 | 页码超出范围 | `page=1000` | 返回空数组 `data: []` |
| 4 | 无效 bookId | `bookId='invalid'` | 返回 400 或 404 |
| 5 | 未授权访问 | 无 token | 返回 401 |
| 6 | 大数据量 | 10000+ 词的词书 | 响应时间 < 2s |
| 7 | 并发请求 | 同时请求多页 | 每页返回正确数据 |
| 8 | 网络超时 | 模拟慢查询 | 超时后优雅降级 |

---

## 五、开发流程约束

```
┌─────────────────────────────────────────────────────────────────────┐
│  强制开发流程（AI 必须遵循）                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Step 1: 先写常量定义                                                │
│  ─────────────────────────────────────────────────────────────────  │
│  • 所有数字、字符串必须有命名                                         │
│  • 必须有注释说明用途                                                 │
│  • 文件: constants.ts                                                │
│                                                                      │
│  Step 2: 先写类型定义                                                │
│  ─────────────────────────────────────────────────────────────────  │
│  • 所有接口必须完整                                                   │
│  • 禁止使用 any                                                      │
│  • 文件: types.ts                                                    │
│                                                                      │
│  Step 3: 先写函数签名和注释                                          │
│  ─────────────────────────────────────────────────────────────────  │
│  • 每个函数必须有：                                                   │
│    - 输入参数类型                                                    │
│    - 返回值类型                                                      │
│    - 边界处理说明                                                    │
│    - 调用示例                                                        │
│                                                                      │
│  Step 4: 再写实现                                                    │
│  ─────────────────────────────────────────────────────────────────  │
│  • 严格按设计实现                                                    │
│  • 不随意添加新逻辑                                                  │
│  • 不引入新的魔法数字                                                │
│                                                                      │
│  Step 5: 写完立即验证                                                │
│  ─────────────────────────────────────────────────────────────────  │
│  • 对照边界条件检查清单                                              │
│  • 运行相关测试                                                      │
│  • 手动测试关键路径                                                  │
│                                                                      │
│  Step 6: 代码审查                                                    │
│  ─────────────────────────────────────────────────────────────────  │
│  • 对照本文档检查                                                    │
│  • 确认无 any 类型                                                   │
│  • 确认无魔法数字                                                    │
│  • 确认单一数据流                                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 六、文件结构规范

```
src/app/api/[feature]/
├── route.ts                 # 入口（精简，只做参数校验和调用）
├── [feature]-service.ts     # 核心业务逻辑
├── constants.ts             # 常量定义
├── types.ts                 # 类型定义
└── __tests__/
    └── [feature].test.ts    # 单元测试
```

---

## 七、自检清单

每次提交代码前，对照此清单检查：

| 检查项 | 通过标准 |
|--------|---------|
| [ ] 无魔法数字 | 所有数字都有命名常量 |
| [ ] 无 any 类型 | 所有类型都有明确定义 |
| [ ] 单一数据流 | 同类操作走同一代码路径 |
| [ ] 边界处理 | 所有边界条件都有处理 |
| [ ] 错误处理 | 所有异常都有结构化处理 |
| [ ] 日志完整 | 关键操作有结构化日志 |
| [ ] 注释清晰 | 复杂逻辑有解释 |
| [ ] 测试通过 | 边界测试用例通过 |

---

## 八、历史教训

### 案例 1: 乱序分页失效

**问题**: 使用 `Date.now()` 作为随机种子，每次请求返回不同的单词顺序
**根因**: 没有考虑分页一致性需求
**教训**: 设计时必须考虑"同一会话内一致性"需求

### 案例 2: 3000 词上限

**问题**: 硬编码 `queryPageSize = 3000`，超过 3000 词的词书数据丢失
**根因**: 魔法数字 + 未考虑大数据量场景
**教训**: 所有数字必须是命名常量，必须考虑边界情况

### 案例 3: 客户端去重

**问题**: API 返回重复单词，客户端被迫做去重
**根因**: API 设计缺陷，防御性编程位置错误
**教训**: API 必须保证数据一致性，不应该让客户端补救

---

## 九、参考资源

- [CLAUDE.md](./CLAUDE.md) - 项目代码规范
- [DICTATION_MODULE_DESIGN.md](./DICTATION_MODULE_DESIGN.md) - 听写模块设计文档
