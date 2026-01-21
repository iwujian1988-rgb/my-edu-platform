# 最近访问功能修复说明

## 修复的问题
用户反馈：点击词库卡片后，点击浏览器返回按钮，"最近"标签页没有显示刚才访问的词库。

## 根本原因分析
1. **旧实现的问题**：使用了 `e.preventDefault()` + `router.push()` 手动跳转，这会干扰浏览器的历史记录栈
2. **刷新时机不对**：只在组件挂载和tab切换时获取数据，没有监听浏览器返回

## 修复内容

### 1. BookCard组件点击逻辑优化
**文件**：`src/components/BookCard.tsx`, `src/components/BookLibrary.tsx`

**修改前**：
```typescript
const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault()  // ❌ 阻止默认跳转
  try {
    await fetch('/api/recent-books', { ... })
  } finally {
    router.push(`/library/${book.id}`)  // ❌ 手动跳转
  }
}
```

**修改后**：
```typescript
const handleClick = () => {
  // ✅ 异步发送请求，不等待结果，让Link正常跳转
  fetch('/api/recent-books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId: book.id })
  }).catch(error => {
    console.error('Failed to record book access:', error)
  })
}
```

**好处**：
- 不干扰浏览器的正常导航和历史记录
- fetch请求是fire-and-forget模式，不会阻塞页面跳转
- 即使fetch失败，页面也能正常跳转

### 2. 页面刷新机制增强
**文件**：`src/components/BookLibrary.tsx`

添加了两个刷新触发器：

#### a. visibilitychange 事件监听
```typescript
const useVisibilityChange = (callback: () => void, deps: any[] = []) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        callback()  // 页面重新可见时刷新
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, deps)
}

// 使用
useVisibilityChange(() => {
  if (activeTab === 'recent') {
    console.log('页面重新可见，刷新最近访问数据...')
    fetchRecentBooks()
  }
}, [activeTab])
```

#### b. focus 事件监听
```typescript
useEffect(() => {
  const handleFocus = () => {
    console.log('页面获得焦点，检查是否需要刷新...')
    if (activeTab === 'recent') {
      fetchRecentBooks()
    }
  }
  window.addEventListener('focus', handleFocus)
  return () => window.removeEventListener('focus', handleFocus)
}, [activeTab])
```

## 测试步骤

### 1. 启动开发服务器
```bash
npm run dev
```
服务器运行在：http://localhost:3001

### 2. 测试流程
1. 打开浏览器，访问 http://localhost:3001
2. 打开浏览器控制台（F12）
3. 观察"最近"标签页，应该显示"还没有访问过任何词库"
4. 点击任意词库卡片（例如"雅思高频词汇"）
5. 进入词库详情页
6. **点击浏览器的返回按钮**（不是页面上的返回链接）
7. 观察：
   - 控制台应该输出："页面重新可见，刷新最近访问数据..." 或 "页面获得焦点，检查是否需要刷新..."
   - "最近"标签页应该显示刚才访问的词库

### 3. 验证要点
✅ 点击词库卡片后，能正常跳转到详情页
✅ 浏览器返回按钮能正常工作
✅ 返回后"最近"标签页显示刚才访问的词库
✅ 控制台没有报错

### 4. 调试信息
在浏览器控制台中，你应该能看到：
- 首次加载："获取最近访问的词库" 相关的网络请求
- 点击卡片：POST /api/recent-books 请求
- 返回首页："页面重新可见" 或 "页面获得焦点" 的日志
- 刷新数据：GET /api/recent-books 请求

## API端点验证

### GET /api/recent-books
返回用户最近访问的8个词库
```bash
# 在浏览器控制台运行
fetch('/api/recent-books')
  .then(r => r.json())
  .then(data => console.log(data))
```

### POST /api/recent-books
记录词库访问
```bash
# 在浏览器控制台运行（替换 BOOK_ID 为实际ID）
fetch('/api/recent-books', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ bookId: 'BOOK_ID' })
})
```

## 已知问题
无

## 修改文件清单
- ✅ src/components/BookCard.tsx
- ✅ src/components/BookLibrary.tsx
