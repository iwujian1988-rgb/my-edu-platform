# 简化版学习状态恢复 - 基于URL的方案

## 核心思想

**所有状态都在URL上，不需要数据库，不需要对话框**

### 优点

1. ✅ **简单直接**：URL就是状态，不需要额外存储
2. ✅ **自动恢复**：用户刷新、后退、前进都能正确恢复
3. ✅ **可分享**：用户可以复制URL分享给他人（显示相同的筛选和页码）
4. ✅ **无时序问题**：不需要useRef、useLayoutEffect等复杂控制
5. ✅ **符合RESTful**：URL表达了当前页面状态

### URL格式

```
/library/[bookId]?page=2&theme=xxx&status=known&chapter=xxx
```

## 实现方案

### 1. 翻页时更新URL

**手机端（竖屏）- 追加模式**：
```typescript
const handleLoadMore = () => {
  const nextPage = currentPage + 1
  setCurrentPage(nextPage)
  // 更新URL（不刷新页面）
  updateURL({ page: nextPage })
}
```

**PC端（横屏）- 翻页模式**：
```typescript
const handlePageChange = (newPage: number) => {
  setCurrentPage(newPage)
  updateURL({ page: newPage })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
```

### 2. 筛选时更新URL

```typescript
const handleFilterChange = (filter: string, value: string) => {
  setState(value)
  updateURL({ [filter]: value })
}
```

### 3. 页面加载时从URL恢复状态

```typescript
useEffect(() => {
  const page = parseInt(searchParams.get('page') || '1')
  const theme = searchParams.get('theme') || 'all'
  const status = searchParams.get('status') || 'all'

  setCurrentPage(page)
  setSelectedTheme(theme)
  setSelectedStatus(status)
  // ... 其他筛选条件
}, [searchParams])
```

### 4. updateURL 工具函数

```typescript
import { useRouter, useSearchParams } from 'next/navigation'

export function useUpdateURL() {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (params: Record<string, string | number | null | undefined>) => {
    const newParams = new URLSearchParams(searchParams.toString())

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === 'all') {
        newParams.delete(key)
      } else {
        newParams.set(key, String(value))
      }
    })

    const newUrl = `${window.location.pathname}?${newParams.toString()}`
    router.replace(newUrl, { scroll: false }) // scroll: false 保持滚动位置
  }
}
```

## 与当前方案的对比

| 维度 | 当前方案（数据库+对话框） | 新方案（纯URL） |
|------|-------------------------|----------------|
| 复杂度 | 高（需要数据库、对话框、时序控制） | 低（只需要URL参数） |
| 用户体验 | 需要点击对话框选择 | 自动恢复，无需选择 |
| 可分享性 | ❌ 不能分享状态 | ✅ 可以分享URL |
| 浏览器历史 | ❌ 不支持后退 | ✅ 支持后退/前进 |
| Bug风险 | 高（时序问题、竞态条件） | 低（无复杂状态） |

## 迁移步骤

1. ✅ 创建 `useUpdateURL` hook
2. ✅ 修改翻页逻辑，调用 `updateURL()`
3. ✅ 修改筛选逻辑，调用 `updateURL()`
4. ❌ 删除数据库保存逻辑
5. ❌ 删除对话框相关代码
6. ❌ 删除 `isRestoringRef`、`hasRestoredState` 等状态
7. ✅ 简化useEffect，直接从URL读取

## 关键代码

### 更新URL（不刷新）

```typescript
const updateURL = (params: Record<string, string | number>) => {
  const newParams = new URLSearchParams(searchParams.toString())

  Object.entries(params).forEach(([key, value]) => {
    if (value === 'all' || value === null || value === undefined) {
      newParams.delete(key)
    } else {
      newParams.set(key, String(value))
    }
  })

  const queryString = newParams.toString()
  const newUrl = queryString ? `?${queryString}` : ''

  // 使用replace避免创建历史记录
  router.replace(`${window.location.pathname}${newUrl}`, { scroll: false })
}
```

### 从URL恢复状态

```typescript
useEffect(() => {
  const page = parseInt(searchParams.get('page') || '1', 10)
  const theme = searchParams.get('theme') || 'all'
  const scenario = searchParams.get('scenario') || 'all'
  const chapter = searchParams.get('chapter') || 'all'
  const status = searchParams.get('status') || 'all'

  setCurrentPage(page)
  setSelectedTheme(theme)
  setSelectedScenario(scenario)
  setSelectedChapter(chapter)
  setStatusFilter(status as StatusFilter)

  console.log('📍 Restored from URL:', { page, theme, scenario, chapter, status })
}, [searchParams])
```

## 总结

这个方案**更简单、更可靠、更符合Web标准**。

唯一的"缺点"是用户不能"从头开始"（因为URL总是保存状态），但这个功能本来就不太必要——如果用户想从头开始，清空URL参数就行了。

---

**建议：立即采用这个方案，废弃之前的数据库+对话框方案。**
