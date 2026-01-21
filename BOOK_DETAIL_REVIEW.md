# BookDetailPageClient 逻辑Review

## 问题汇总
1. ❌ 未标注筛不出结果
2. ❌ 横屏竖屏翻页逻辑混乱
3. ❌ 筛选和翻页的交互问题

## 代码逻辑分析

### 1. API数据获取 (lines 195-255)
**当前逻辑：**
```typescript
const append = isPortrait && currentPage > 1

if (append) {
  // 追加模式：添加到现有列表
  setWords(prev => [...prev, ...(data.data || [])])
} else {
  // 替换模式：重新加载
  setWords(data.data || [])
}
```

**问题：**
- API调用时使用了 `status=all`，但筛选条件（statusFilter、theme等）没有传递给API
- 这意味着API总是返回所有单词，客户端筛选
- 筛选应该在后端做，否则数据量大会很慢

### 2. 客户端筛选逻辑 (lines 465-516)
**当前逻辑：**
```typescript
const filteredWords = useMemo(() => {
  let result = [...words]  // 使用已加载的words

  // 1. 章节筛选
  if (selectedChapter !== 'all') {
    result = result.filter(word => word.chapter_id === selectedChapter)
  }

  // 2. 状态筛选
  if (statusFilter !== 'all') {
    result = result.filter(word => {
      const actualStatus = localStorageStatus[word.id] || word.status
      return actualStatus === statusFilter
    })
  }

  // ... 其他筛选
}, [words, selectedChapter, selectedTheme, selectedScene, statusFilter, sortOrder, book.id])
```

**问题：**
- `filteredWords` 只从已加载的 `words` 中筛选
- 横屏模式下，第2页只有51-100这50个单词
  - 如果用户筛选"未标注"，但51-100都是已标注的，结果为空
  - 用户会认为筛选坏了
- **正确的逻辑应该是：筛选时重置到第1页，从所有数据中筛选**

### 3. 筛选条件改变时的处理 (lines 583-587)
**当前逻辑：**
```typescript
useEffect(() => {
  setCurrentPage(1)
  setHasMore(true)
}, [statusFilter, sortOrder, selectedTheme, selectedScene])
```

**问题：**
- 只重置了页码，但 `words` 列表没有被清空/重新加载
- 这导致筛选使用的是旧的数据

### 4. 竖屏/横屏切换逻辑 (lines 134-160)
**当前逻辑：**
```typescript
setIsPortrait(prev => {
  if (prev !== portrait) {
    setCurrentPage(1)
    setWords([])  // 清空单词列表
  }
  return portrait
})
```

**问题：**
- 清空单词列表是对的
- 但没有重新触发数据加载（应该通过依赖变化触发）

### 5. 隐藏中文逻辑
- 通过 `GlobalHideButton` 组件实现
- 存储在 localStorage
- 传给 `WordList` 组件
- 这个逻辑看起来没问题

## 解决方案

### 方案1：筛选时重新加载数据（推荐）
```typescript
// 筛选条件改变时，清空列表并重新加载
useEffect(() => {
  setCurrentPage(1)
  setWords([])  // 清空列表，触发重新加载
  setHasMore(true)
}, [statusFilter, sortOrder, selectedTheme, selectedScene, selectedChapter])
```

### 方案2：API支持筛选参数
把筛选条件传给API，让后端返回筛选后的结果：
```typescript
const response = await fetch(
  `/api/words?bookId=${book.id}&status=${statusFilter}&theme=${selectedTheme}&page=${currentPage}&pageSize=50`
)
```

## 需要修复的地方

1. ✅ 筛选条件改变时，清空 `words` 列表
2. ✅ 竖屏/横屏切换时，触发数据重新加载
3. ✅ 确保筛选使用完整的数据，而不是当前页的数据
4. ✅ 测试各种筛选组合
