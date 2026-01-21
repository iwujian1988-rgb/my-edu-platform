# 首页"最近学习"显示空状态修复总结

## 问题描述
用户反馈首页的"最近3个学习的快捷方式"区域显示"空空如也"，而不是显示最近学习的书籍。

## 根本原因分析

### 数据流问题
1. **数据源不完整**: 原始代码只查询 `user_book_preferences` 表，该表只在打字练习模式下更新
2. **缺少备用数据源**: 其他学习模式（卡片、默写等）更新 `word_progress` 表，但首页未查询
3. **数据格式不匹配**: `page.tsx` 获取的是 `recentBooks` 数据，但 `DashboardContent` 组件期望的是 `progressCards` 格式

### 技术细节
- `DashboardContent` 组件在 line 172 检查 `progressCards.length > 0`
- 如果为空，显示 `<EmptyState />` 组件（即"空空如也"）
- `page.tsx` 传递的是 `recentBooks` prop，而非 `progressCards`
- 结果：`progressCards` 始终为空数组 `[]`

## 修复方案

### 1. 三层数据源优先级系统
在 `page.tsx` (lines 66-108) 添加了5个并行查询：

```typescript
const [
  recentPrefsResult,        // 1. user_book_preferences (最高优先级)
  mistakesResult,
  todayWordsResult,
  recentProgressResult,     // 2. word_progress (备用)
  typingRecentResult        // 3. typing_recent_practice (额外备用)
] = await Promise.all([
  // Query 1: user_book_preferences
  supabase.from('user_book_preferences')
    .select('book_id, last_accessed_at')
    .eq('user_id', user.id)
    .not('last_accessed_at', 'is', null)
    .order('last_accessed_at', { ascending: false })
    .limit(3),

  // Query 4: word_progress (备用)
  supabase.from('word_progress')
    .select('book_id, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(10),

  // Query 5: typing_recent_practice RPC
  supabase.rpc('get_typing_recent_practice', { p_user_id: user.id })
])
```

### 2. 三层回退逻辑
在 `page.tsx` (lines 176-206) 实现优先级系统：

```typescript
// 优先级: user_book_preferences > typing_recent_practice > word_progress
let recentBookIds: string[] = []

if (recentPrefs && recentPrefs.length > 0) {
  recentBookIds = recentPrefs.map(pref => pref.book_id)
  console.log('📋 使用 user_book_preferences 数据源')
} else if (typingRecent && typingRecent.length > 0) {
  // 去重并提取前3个
  const uniqueBooks = new Map<string, string>()
  for (const row of typingRecent) {
    if (!uniqueBooks.has(row.book_id)) {
      uniqueBooks.set(row.book_id, row.last_practice_at || row.created_at)
      if (uniqueBooks.size >= 3) break
    }
  }
  recentBookIds = Array.from(uniqueBooks.keys())
  console.log('⌨️ 使用 typing_recent_practice 数据源')
} else if (recentProgress && recentProgress.length > 0) {
  // 去重并提取前3个
  const uniqueBooks = new Map<string, string>()
  for (const row of recentProgress) {
    if (!uniqueBooks.has(row.book_id)) {
      uniqueBooks.set(row.book_id, row.updated_at)
      if (uniqueBooks.size >= 3) break
    }
  }
  recentBookIds = Array.from(uniqueBooks.keys())
  console.log('📖 使用 word_progress 数据源')
}
```

### 3. 数据格式转换
在 `page.tsx` (lines 317-399) 添加 `recentBooks` 到 `progressCards` 的转换：

```typescript
// 🔧 转换 recentBooks 为 progressCards 格式
let progressCards: ProgressCardProps[] = []

if (recentBooks && recentBooks.length > 0) {
  // 获取 resume_state 和进度信息
  const bookIds = recentBooks.map(b => b.id)
  const { data: userPrefsData } = await supabase
    .from('user_book_preferences')
    .select('book_id, last_resume_state')
    .eq('user_id', user.id)
    .in('book_id', bookIds)

  // 获取学习进度统计
  const { data: progressStatsData } = await supabase
    .from('word_progress')
    .select('book_id, status')
    .eq('user_id', user.id)
    .in('book_id', bookIds)

  // 构建统计映射
  const statsMap: Record<string, { known: number, fuzzy: number, total: number }> = {}
  if (progressStatsData) {
    for (const row of progressStatsData) {
      if (!statsMap[row.book_id]) {
        statsMap[row.book_id] = { known: 0, fuzzy: 0, total: 0 }
      }
      if (row.status === 'known') statsMap[row.book_id].known++
      else if (row.status === 'fuzzy') statsMap[row.book_id].fuzzy++
      statsMap[row.book_id].total++
    }
  }

  // 构建 resume_state 映射
  const prefsMap = new Map(userPrefsData?.map(p => [p.book_id, p.last_resume_state]) || [])

  // 转换为 ProgressCard 格式
  progressCards = recentBooks.slice(0, 3).map(book => {
    const resumeState = prefsMap.get(book.id)
    const stats = statsMap[book.id] || { known: 0, fuzzy: 0, total: 0 }
    const totalWords = book.total_words || 0

    // 计算学习进度
    const learnedCount = stats.known + stats.fuzzy
    const progress = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0

    // 从 resume_state 获取模式信息
    const mode = resumeState?.mode || 'typing'
    const scopeType = resumeState?.context?.scope || 'unknown'
    const currentIndex = resumeState?.context?.index || 0

    // 生成 continue URL
    let continueURL = `/library/${book.id}`
    if (resumeState?.mode === 'word-list') {
      continueURL = `/library/${book.id}`
    } else if (resumeState?.mode === 'flashcards') {
      continueURL = `/study/${book.id}/flashcards?scope=${scopeType}&shuffle=true&index=${currentIndex}`
    } else if (resumeState?.mode === 'dictation') {
      continueURL = `/study/${book.id}/dictation?index=${currentIndex}`
    } else if (resumeState?.mode === 'typing') {
      continueURL = `/practice?bookId=${book.id}&scope=${scopeType}`
    }

    return {
      bookId: book.id,
      bookTitle: book.title,
      mode,
      progress,
      scopeType,
      currentIndex,
      totalWords,
      lastStudyTime: new Date(book.last_accessed_at || Date.now()).getTime(),
      continueURL
    }
  })
}
```

### 4. 传递正确的 props
在 `page.tsx` (line 511) 添加 `progressCards` prop：

```typescript
<DashboardContent
  books={books}
  progressCards={progressCards}  // ✅ 新增
  lastStudyBook={lastStudyBook}
  mistakesCount={mistakesCount}
  todayNewWordsCount={todayNewWordsCount}
  userEmail={user.email}
  userId={user.id}
  recentBooks={recentBooks}
/>
```

## 数据流程图

```
用户学习活动
    ↓
┌─────────────────────────────────────────────────┐
│ 数据源（3个表）                                  │
│ 1. user_book_preferences (打字练习)             │
│ 2. typing_recent_practice (打字记录)            │
│ 3. word_progress (所有学习模式)                  │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ 三层优先级系统                                   │
│ if (prefs) → 使用 prefs                         │
│ else if (typing) → 使用 typing                  │
│ else if (progress) → 使用 progress              │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ 查询书籍详情                                     │
│ → recentBooks (基础信息)                        │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ 查询额外信息                                     │
│ - resume_state (学习模式、范围、索引)            │
│ - word_progress (学习进度统计)                   │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ 数据转换                                         │
│ recentBooks → progressCards                     │
│ (添加 mode, progress, scopeType 等)             │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ DashboardContent 组件                            │
│ 检查: progressCards.length > 0                   │
│ → 显示3个进度卡片                                │
│ → 或显示 EmptyState ("空空如也")                │
└─────────────────────────────────────────────────┘
```

## 调试日志

添加了详细的调试日志（lines 119-135, 308-398）：

```
=== 首页数据调试 ===
用户ID: xxx
recentPrefs (user_book_preferences): 3 条
typingRecent (typing_recent_practice): 5 条
recentProgress (word_progress): 10 条
📋 使用 user_book_preferences 数据源
🔍 recentBookIds 提取结果: 3 个
📖 书籍查询结果: 3 本
📚 最终 recentBooks 数据: 3 条
🔄 开始转换 recentBooks 为 progressCards...
✅ 转换完成，生成 3 个 progressCards
```

## 文件修改列表

### 修改的文件
1. `src/app/page.tsx`:
   - Line 9: 添加 `import type { ProgressCardProps } from '@/types/progress'`
   - Lines 66-108: 添加5个并行查询（包括 typing_recent_practice RPC）
   - Lines 119-135: 添加调试日志
   - Lines 176-206: 实现三层优先级回退逻辑
   - Lines 208-304: 更新书籍映射逻辑
   - Lines 317-399: 添加 recentBooks → progressCards 转换逻辑
   - Line 511: 传递 progressCards prop 到 DashboardContent

### 相关文件（未修改）
- `src/components/DashboardContent.tsx`: 使用 progressCards 数据
- `src/types/progress.ts`: 定义 ProgressCardProps 接口
- `src/components/EmptyState.tsx`: 显示"空空如也"空状态

## 测试验证

### 1. 数据源验证
测试三种场景：
- ✅ 用户使用打字练习 → 显示 user_book_preferences 数据
- ✅ 用户使用其他学习模式 → 显示 word_progress 数据
- ✅ 用户使用打字练习但无 user_book_preferences → 显示 typing_recent_practice 数据

### 2. 空状态验证
- ✅ 用户没有任何学习记录 → 显示"空空如也"
- ✅ 用户有学习记录 → 显示最多3个最近学习的书籍

### 3. 数据完整性验证
- ✅ 进度卡片显示正确的书名
- ✅ 进度百分比正确计算
- ✅ 学习模式图标正确显示
- ✅ 继续学习 URL 正确生成

## 性能优化

1. **并行查询**: 使用 `Promise.all` 同时执行5个查询
2. **数据缓存**: scopeStatsMap 在服务端缓存，避免重复查询
3. **限制数据量**:
   - user_book_preferences: 3条
   - word_progress: 10条（然后去重到3个）
   - typing_recent_practice: RPC限制返回数量

## 后续建议

1. **移除调试日志**: 生产环境可以移除 console.log 语句
2. **监控性能**: 观察并行查询对首页加载速度的影响
3. **缓存优化**: 考虑使用 Redis 缓存 recentBooks 数据
4. **用户反馈**: 收集用户对"最近学习"功能的反馈

## 总结

此次修复解决了首页"最近学习"区域显示空状态的问题，通过：
1. 添加多层备用数据源
2. 实现优先级回退系统
3. 正确转换数据格式
4. 传递正确的组件 props

现在无论用户使用哪种学习模式，首页都能正确显示最近学习的3个书籍快捷方式。
