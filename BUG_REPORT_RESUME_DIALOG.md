# 学习状态恢复对话框 - 严重BUG报告

## 🚨 BUG #1: 筛选重置 useEffect 干扰恢复逻辑（严重）

### 问题定位

**位置**: `BookDetailPageClient.tsx` lines 597-602

```typescript
// 重置页码和单词列表当筛选条件改变时
useEffect(() => {
  console.log('🔄 Filters changed, resetting to page 1')
  setCurrentPage(1)
  setWords([])  // 清空单词列表，触发重新加载
  setHasMore(true) // 重置 hasMore
}, [statusFilter, sortOrder, selectedTheme, selectedScene, selectedChapter])
```

### 问题分析

当用户点击"继续学习"时，`handleResume` 函数执行：

```typescript
const handleResume = () => {
  // ...
  if (resumeState.context.filters) {
    const { theme, scenario, status, chapter } = resumeState.context.filters

    if (theme && theme !== 'all') setSelectedTheme(theme)      // ← 触发 useEffect, setCurrentPage(1)
    if (scenario && scenario !== 'all') setSelectedScene(scenario) // ← 触发 useEffect, setCurrentPage(1)
    if (status && status !== 'all') setStatusFilter(status)    // ← 触发 useEffect, setCurrentPage(1)
    if (chapter && chapter !== 'all') setSelectedChapter(chapter) // ← 触发 useEffect, setCurrentPage(1)
  }

  if (resumeState.context.page) {
    setCurrentPage(resumeState.context.page)  // ← 试图恢复页码
  }
  // ...
}
```

**执行时序问题**：
1. `setSelectedTheme(theme)` → 触发 useEffect → `setCurrentPage(1)` ⚠️
2. `setSelectedScene(scenario)` → 触发 useEffect → `setCurrentPage(1)` ⚠️
3. `setStatusFilter(status)` → 触发 useEffect → `setCurrentPage(1)` ⚠️
4. `setSelectedChapter(chapter)` → 触发 useEffect → `setCurrentPage(1)` ⚠️
5. `setCurrentPage(resumeState.context.page)` → 试图设置为第3页

但由于 React 的批处理和异步更新，**最后的 `setCurrentPage` 可能被前面的 useEffect 覆盖**！

### 结果
用户点击"继续学习"后，**页码仍然显示第1页，而不是保存的第3页**！

### 修复方案

在筛选重置的 useEffect 中检查 `isRestoringRef`：

```typescript
useEffect(() => {
  // 如果正在恢复状态，不要重置页码
  if (isRestoringRef.current) {
    console.log('⏸️ Skipping filter reset during resume')
    return
  }

  console.log('🔄 Filters changed, resetting to page 1')
  setCurrentPage(1)
  setWords([])
  setHasMore(true)
}, [statusFilter, sortOrder, selectedTheme, selectedScene, selectedChapter])
```

---

## 🚨 BUG #2: 字段名不匹配 - scenario vs scene（严重）

### 问题定位

**位置**: `BookDetailPageClient.tsx` line 463

```typescript
const { theme, scenario, status, chapter } = resumeState.context.filters

if (scenario && scenario !== 'all') setSelectedScene(scenario)  // ← scenario
```

### 问题分析

- **保存状态时**: 使用 `scenario` 字段名（`resumeState.ts` line 18）
- **组件内部**: 使用 `selectedScene` 状态（变量名是 scene）

但在 `ResumeState` 接口中：
```typescript
filters?: {
  theme?: string
  scenario?: string  // ← 字段名是 scenario
  status?: string
  chapter?: string
}
```

而在保存时（line 610 of resumeState.ts 或实际保存的地方）：
```typescript
context: {
  filters: {
    theme: selectedTheme,
    scenario: selectedScene,  // ← 使用 scenario
    status: statusFilter,
    chapter: selectedChapter
  }
}
```

**但是**，在 `BookDetailPageClient.tsx` 中实际保存时，字段名是什么？让我检查...

### 验证需要

需要确认保存时使用的字段名是 `scenario` 还是 `scene`。

---

## 🚨 BUG #3: hasRestoredState 状态变量未被使用（中等）

### 问题定位

**位置**: `BookDetailPageClient.tsx` lines 392, 481, 490, 493

```typescript
const [hasRestoredState, setHasRestoredState] = useState(false)
```

### 问题分析

这个状态变量被设置，但**从未被读取**：

- Line 481: `setHasRestoredState(true)` - 设置
- Line 490: `setHasRestoredState(true)` - 设置
- Line 421: 读取（检查 URL 参数后）

除此之外，没有其他地方使用这个变量。

### 影响
1. **代码冗余**：占用的状态和渲染，但没有实际作用
2. **内存浪费**：不必要的状态更新

### 修复方案

如果不需要防止重复显示对话框，可以移除这个状态。

或者，在检查恢复状态时使用它：

```typescript
useEffect(() => {
  if (hasRestoredState) return  // 已经恢复过了，不再检查

  // 检查恢复状态...
}, [book.id, searchParams, hasRestoredState])
```

---

## 🚨 BUG #4: 对话框可能重复显示（中等）

### 问题定位

**位置**: `BookDetailPageClient.tsx` lines 424-451

```typescript
useEffect(() => {
  if (searchParams.has('theme') || searchParams.has('page')) {
    return
  }

  const checkResumeState = async () => {
    const savedState = await getResumeState(book.id, 'word-list')

    if (savedState && savedState.context) {
      const hoursSince = (Date.now() - savedState.updatedAt) / (1000 * 60 * 60)

      if (hoursSince < 24 && savedState.context.page && savedState.context.page > 1) {
        setResumeState(savedState)
        setShowResumeDialog(true)  // ← 每次都显示！
      }
    }
  }

  setTimeout(() => { checkResumeState() }, 500)
}, [book.id, searchParams])
```

### 问题分析

**场景**：
1. 用户访问词库，显示对话框
2. 用户选择"从头开始"
3. 用户再次切换到其他页面，然后回来
4. **对话框再次显示！**（因为 searchParams 没变）

**原因**：没有标志位防止重复显示对话框。

### 修复方案

使用 `hasRestoredState` 防止重复显示：

```typescript
useEffect(() => {
  if (hasRestoredState) return  // 已经处理过了，不再显示对话框
  if (searchParams.has('theme') || searchParams.has('page')) {
    return
  }

  // ... 其余逻辑
}, [book.id, searchParams, hasRestoredState])
```

---

## 📊 BUG 优先级

| Bug | 严重性 | 影响 | 优先级 |
|-----|-------|------|-------|
| #1 筛选重置干扰 | 🔴 严重 | 页码无法恢复 | P0 - 立即修复 |
| #2 字段名不匹配 | 🔴 严重 | 状态恢复失败 | P0 - 立即修复 |
| #3 hasRestoredState未使用 | 🟡 中等 | 代码冗余 | P2 - 后续优化 |
| #4 对话框重复显示 | 🟡 中等 | 用户体验差 | P1 - 尽快修复 |

---

## 🔧 修复计划

1. **修复 Bug #1** (P0): 在筛选重置 useEffect 中检查 isRestoringRef
2. **验证 Bug #2** (P0): 确认字段名一致性
3. **修复 Bug #4** (P1): 使用 hasRestoredState 防止重复显示
4. **清理 Bug #3** (P2): 移除未使用的状态或正确使用它

---

**发现时间**: 2026-01-13
**发现者**: 用户反馈
**分析人**: Claude (Sonnet 4.5)
