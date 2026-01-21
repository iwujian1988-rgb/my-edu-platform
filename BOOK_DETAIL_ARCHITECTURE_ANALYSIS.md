# BookDetailPage 模块完整分析

## 一、架构概览

### 1.1 文件结构
```
┌─────────────────────────────────────────────────────────────┐
│                         前端架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  page.tsx (服务端组件)                                        │
│    ├─ 获取用户、书籍、章节                                    │
│    ├─ 调用 getWordsForBookServer() 获取初始数据              │
│    └─ 传递给 BookDetailPageClient                            │
│                         ↓                                    │
│  BookDetailPageClient (客户端组件)                           │
│    ├─ useBookFilters Hook - 管理筛选状态和URL                │
│    ├─ useWordData Hook - 获取和筛选单词数据                  │
│    ├─ useScreenOrientation Hook - 屏幕方向                   │
│    └─ WordList - 渲染单词列表                                │
│                         ↓                                    │
│  displayWords (useMemo) - 最终显示的单词数组                  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                         后端架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  /api/words (GET)                                             │
│    ├─ 认证用户（cookies + Authorization header）             │
│    ├─ 检查权限                                               │
│    ├─ 获取用户进度（word_progress）                          │
│    ├─ 调用 RPC get_book_words_paginated                      │
│    ├─ 附加 status 到每个单词                                 │
│    └─ 返回分页数据                                           │
│                                                               │
│  words-server.ts                                              │
│    └─ getWordsForBookServer() - SSR专用获取函数              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 数据流转

```
用户操作 → URL参数 → useBookFilters → useWordData → API
    ↓           ↓            ↓             ↓         ↓
  点击筛选   更新URL    更新filters    调用API   返回words
    ↓                                           ↓
  updateFilter                                 筛选逻辑
    ↓                                           ↓
  setFilters                                 displayWords
```

## 二、核心数据结构

### 2.1 BookFilters (useBookFilters)
```typescript
interface BookFilters {
  page: number           // 当前页码
  theme: string         // 主题筛选 ('all' | 具体主题)
  scenario: string      // 场景筛选 ('all' | 具体场景)
  chapter: string       // 章节筛选 ('all' | 具体章节ID)
  status: StatusFilter  // 状态筛选 ('all' | 'new' | 'unknown' | 'fuzzy' | 'known')
}
```

### 2.2 Word (useWordData)
```typescript
interface Word {
  id: string
  word: string
  phonetic: string
  uk_phonetic?: string
  us_phonetic?: string
  definition: string
  definition_en: string
  collocation: string
  collocation_en: string
  example_sentence: string
  example_sentence_en: string
  part_of_speech: string
  status: 'known' | 'fuzzy' | 'unknown' | 'new'
  theme?: string        // 主题（用于客户端筛选）
  scene?: string        // 场景（用于客户端筛选）
  chapter?: string      // 章节（用于客户端筛选）
  chapter_id?: string | null
}
```

### 2.3 ReadingProgress (阅读进度)
```typescript
interface ReadingProgress {
  bookId: string
  page: number
  theme: string
  scenario: string
  chapter: string
  status: StatusFilter
}
```

## 三、关键模块详解

### 3.1 useBookFilters Hook

**职责**：管理URL参数与组件状态的同步

**核心功能**：
1. 从URL参数恢复筛选状态
2. 筛选条件改变时同步到URL
3. 自动保存阅读进度

**关键方法**：
```typescript
updateFilter<K>(key: K, value: BookFilters[K]) {
  // 1. 更新内部状态
  setFilters(prev => ({ ...prev, [key]: value }))

  // 2. 同步到URL（筛选条件改变时重置页码为1）
  updateURL({
    [key]: value,
    page: key === 'page' ? value : 1  // 🔥 关键：非page改变时重置页码
  })
}
```

**问题点**：
- `updateURL` 只更新 URL，**不会触发 filters.page 的实际改变**
- 这导致 URL 显示 page=1，但 filters.page 还是旧值

### 3.2 useWordData Hook

**职责**：管理单词数据的获取、筛选和分页

**数据获取逻辑**：
```typescript
useEffect(() => {
  const fetchWords = async () => {
    // 🔥 优化：如果是第一页且已有初始数据，跳过API调用
    if (filters.page === 1 && initialDataLoadedRef.current) {
      return  // ⚠️ 问题：只检查page，不检查status等其他筛选条件
    }

    // 构建API参数
    const params = {
      bookId: book.id,
      status: filters.status,  // 使用当前filters.status
      page: filters.page,
      pageSize: '21'
    }

    const response = await authenticatedFetch(`/api/words?${params}`)
    // ... 处理响应
  }
}, [book.id, filters.page, filters.status, isPortrait])
```

**筛选逻辑**（客户端）：
```typescript
const filteredWords = useMemo(() => {
  let result = [...words]

  // 章节筛选
  if (filters.chapter !== 'all') {
    result = result.filter(word => word.chapter_id === filters.chapter)
  }

  // 主题筛选
  if (filters.theme !== 'all') {
    result = result.filter(word => word.theme === filters.theme)
  }

  // 场景筛选
  if (filters.scenario !== 'all') {
    result = result.filter(word => word.scene === filters.scenario)
  }

  return result
}, [words, filters.chapter, filters.theme, filters.scenario])
```

**问题点**：
1. `initialDataLoadedRef` 只在 page=1 时有效，不考虑筛选条件变化
2. status 筛选在**服务端**完成，theme/scenario/chapter 在**客户端**筛选
3. 筛选逻辑分散在服务端和客户端，容易出问题

### 3.3 BookDetailPageClient 组件

**状态管理**：
```typescript
// 翻页状态
const [isPageChanging, setIsPageChanging] = useState(false)
const [showSkeleton, setShowSkeleton] = useState(false)

// 数据显示
const displayWords = useMemo(() => {
  // 🔥 如果正在翻页，返回空数组
  if (isPageChanging) {
    return []
  }

  let result = [...words]
  // ... 排序逻辑
  return result
}, [words, sortOrder, isPageChanging])
```

**翻页处理**：
```typescript
const handlePageChange = (newPage: number) => {
  setIsPageChanging(true)  // 显示骨架屏
  setPage(newPage)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
```

**骨架屏隐藏**：
```typescript
useEffect(() => {
  // 检测第一个单词ID是否改变
  if (showSkeleton && words.length > 0) {
    const currentFirstWordId = words[0].id

    if (currentFirstWordId !== firstWordIdRef.current) {
      // 新数据到达，隐藏骨架屏
      setShowSkeleton(false)
      setIsPageChanging(false)  // 🔥 关键：重置翻页状态
    }
  }
}, [showSkeleton, words, filters.page, isPageChanging])
```

## 四、当前问题分析

### 4.1 问题复现路径

```
1. 进入单词列表（status=all, page=1）
2. 选择"否"不恢复进度
3. 筛选改为"已认识"（status=known, page=1）
   → useBookFilters: updateFilter('status', 'known')
   → updateURL({ status: 'known', page: 1 })
   → useWordData 检测到 status 改变，清除 initialDataLoadedRef
   → useWordData 调用 API 获取 status=known 的数据
   → ✅ 正常显示第1页"已认识"

4. 翻页到第2页（status=known, page=2）
   → handlePageChange(2)
   → setIsPageChanging(true)
   → useWordData 调用 API 获取 page=2, status=known 的数据
   → 骨架屏检测到新数据，隐藏骨架屏
   → ✅ 正常显示第2页"已认识"

5. 将"已认识"改成"全部"（status=all, page=2）
   → useBookFilters: updateFilter('status', 'all')
   → updateURL({ status: 'all', page: 1 })  // URL重置为page=1
   → useWordData 检测到 status 改变，清除 initialDataLoadedRef
   → useWordData 调用 API 获取 page=2, status=all 的数据
      ⚠️ 问题：filters.page 还是 2，所以API请求的是page=2

   → API返回 page=2, status=all 的数据
   → words 更新为新数据
   → 但 displayWords 因为 isPageChanging=true 返回空数组
   → ❌ 页面卡住，什么都不显示
```

### 4.2 根本原因

**核心矛盾**：
1. `updateFilter` 在非 page 参数改变时，会**将URL中的page设为1**
2. 但**不会改变** `filters.page` 的值
3. 导致 URL 和 filters.page 不一致

**具体表现**：
- URL: `?status=all&page=1`
- filters: `{ status: 'all', page: 2 }`

**为什么会卡住**：
1. 第2页"已认识"时，`isPageChanging = false`
2. 点击"全部"时，只改变 status，**不触发** handlePageChange
3. `isPageChanging` 保持为 false（这是对的）
4. 但是 `useWordData` 依赖 `filters.page`，而 `filters.page` 还是 2
5. 所以API请求的是 page=2, status=all 的数据
6. 数据到达后，更新 words
7. `displayWords` 计算时，`isPageChanging` 是 false，应该显示数据
8. **但是**，从日志看 `isPageChanging` 还是 true！

**等等，让我重新看日志**...

从日志看：
```
📖 Fetching words (page 2, append: false, isPortrait: false)
✅ API response: {success: true, dataLength: 12, total: 5862}
🔄 Words replaced: 12 words, total: 39
✅ Fetch complete (page 2)
🔥 [displayWords] Page changing, returning empty array  ← isPageChanging 还是 true！
```

**真正的原因**：
- 用户在第2页"已认识"时，`isPageChanging` 已经在翻页完成后被**重置为 false**
- 但是当改成"全部"时，并没有新的操作来设置 `isPageChanging`
- 为什么日志显示 `isPageChanging` 还是 true？

**可能的原因**：
1. 筛选条件改变时，触发了组件重新渲染
2. 在某个地方又设置了 `isPageChanging = true`
3. 或者 `displayWords` 的依赖有问题，读取了旧的 state

### 4.3 深层问题

**架构问题**：
1. **状态分散**：
   - URL 状态（searchParams）
   - useBookFilters 内部状态（filters）
   - BookDetailPageClient 状态（isPageChanging）
   - useWordData 内部状态（words, isLoading）

2. **同步困难**：
   - updateFilter 更新 URL 和 filters
   - 但 URL 和 filters 可能不一致（page 参数）
   - isPageChanging 和实际的翻页状态也可能不一致

3. **筛选逻辑混乱**：
   - status 在**服务端**筛选（API参数）
   - theme/scenario/chapter 在**客户端**筛选（useMemo）
   - 导致难以判断何时需要重新获取数据

## 五、修复方案

### 5.1 方案A：统一筛选逻辑（推荐）

**目标**：所有筛选都在服务端完成，客户端只负责显示

**步骤**：
1. 修改 API，支持 theme/scenario/chapter 参数
2. useWordData 只负责调用API获取数据
3. 客户端不再做任何筛选

**优点**：
- 逻辑清晰，易于维护
- 性能更好（服务端筛选可以优化查询）
- 状态管理简单

**缺点**：
- 需要修改后端API
- 需要为服务端的 theme/scenario/chapter 字段建立索引

### 5.2 方案B：修复当前架构（临时）

**目标**：在当前架构下修复筛选问题

**步骤**：
1. 修复 updateFilter，确保 URL 和 filters.page 同步
2. 修复 useWordData 的 initialDataLoadedRef 逻辑
3. 在筛选条件改变时，正确重置 isPageChanging

**具体修改**：

**修改1：useBookFilters.ts**
```typescript
const updateFilter = <K extends keyof BookFilters>(
  key: K,
  value: BookFilters[K]
) => {
  console.log(`🔄 Updating filter: ${key} = ${value}`)

  // 🔥 如果不是page改变，需要重置page为1
  if (key !== 'page') {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
    updateURL({ [key]: value, page: 1 })
  } else {
    setFilters(prev => ({ ...prev, [key]: value }))
    updateURL({ [key]: value })
  }
}
```

**修改2：useWordData.ts**
```typescript
// 🔥 记录所有影响数据的筛选条件
const previousFiltersRef = useRef({
  page: filters.page,
  status: filters.status
})

useEffect(() => {
  const currentFilters = { page: filters.page, status: filters.status }
  const filtersChanged =
    currentFilters.page !== previousFiltersRef.current.page ||
    currentFilters.status !== previousFiltersRef.current.status

  if (filtersChanged) {
    // 任何筛选条件改变，都清除初始数据标记
    initialDataLoadedRef.current = false
    previousFiltersRef.current = currentFilters
  }
}, [filters.page, filters.status])
```

**修改3：BookDetailPageClient.tsx**
```typescript
// 🔥 当筛选条件（非page）改变时，重置isPageChanging
const handleStatusChange = (status: StatusFilter) => {
  setIsPageChanging(false)
  setStatus(status)
  setShowFilterMenu(false)
}

const handleThemeChange = (theme: string) => {
  setIsPageChanging(false)
  setTheme(theme)
  setShowThemeMenu(false)
}

// ... 其他筛选handler类似
```

### 5.3 方案C：简化状态管理（长期）

**目标**：使用单一状态源，避免多处同步

**技术选型**：
1. 使用 Zustand 或 Jotai 管理全局状态
2. 或者使用 React Query 管理服务端状态
3. URL 作为唯一状态源（使用 useSyncExternalStore）

## 六、建议

**短期**：实施方案B（快速修复）

**中期**：实施方案A（优化性能）

**长期**：实施方案C（架构升级）

## 七、测试计划

1. **基础筛选测试**：
   - status: all → known → all
   - theme: all → 具体主题 → all
   - scenario: all → 具体场景 → all
   - chapter: all → 具体章节 → all

2. **组合筛选测试**：
   - status=known + theme=xxx
   - status=all + scenario=xxx + chapter=xxx

3. **翻页+筛选测试**：
   - page=1 → page=2 → 改变status
   - page=2 → 改变status → 改变page

4. **边界情况测试**：
   - 空结果（筛选后没有单词）
   - 只有1页数据
   - 大量数据（1000+词）

5. **断点续读测试**：
   - 有进度时打开 → 选择恢复/不恢复
   - 恢复后继续操作
