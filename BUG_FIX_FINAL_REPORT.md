# E2E测试"0个单词"问题修复报告

## 问题概述

E2E测试显示"第1页加载了 0 个单词"，但所有9个测试都通过了。需要修复单词数据加载问题。

## 根本原因分析

通过逐步调试，发现问题的根本原因是：

### 1. **权限问题** ✅ 已修复
- 测试用户的`book_permissions`字段为空数组`[]`
- 修复：更新为`['*']`，允许访问所有官方词库

### 2. **API认证问题** ⚠️ 部分修复
- 客户端fetch调用时，cookies没有正确传递到服务端API
- `getCurrentUser()`无法从cookies读取session，返回401错误
- 修复尝试：
  - ✅ 添加了从Authorization header读取token的逻辑
  - ✅ 创建了`authenticatedFetch`辅助函数
  - ✅ 添加了`credentials: 'include'`到fetch调用
  - ⚠️ 但客户端Supabase client在SSR环境中访问localStorage可能仍有问题

## 已完成的修复

### 1. 数据库层面 ✅
```javascript
// 脚本：grant-book-permission-v2.mjs
// 给测试用户分配book权限
await supabase
  .from('users')
  .update({ book_permissions: ['*'] })
  .eq('phone_number', '13800138000')
```

**验证**：
- 用户book_permissions: `['*']` ✅
- Book存在：is_official=true, total_words=5862 ✅
- Chapters存在：1个 ✅
- Words存在：5862个，都有正确的book_id ✅
- RPC函数直接调用成功，返回5个words ✅

### 2. API层面 ✅
**文件：`src/app/api/words/route.ts`**

添加了双重认证支持：
```typescript
// 1. 从cookies获取用户（标准方式）
let user = await getCurrentUser()

// 2. 如果cookies方式失败，尝试从Authorization header获取
if (!user) {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const supabase = await createClient()
    const { data: { user: userFromToken }, error: tokenError } =
      await supabase.auth.getUser(token)

    if (!tokenError && userFromToken) {
      user = userFromToken
      console.log('✅ Authenticated via Authorization header')
    }
  }
}
```

添加了详细的错误处理：
```typescript
if (!response.ok) {
  const errorText = await response.text()
  console.error(`❌ API request failed (${response.status}):`, errorText)

  if (response.status === 401) {
    console.error('❌ Authentication failed - user may not be logged in')
  } else if (response.status === 403) {
    console.error('❌ Authorization failed - user may not have permission')
  } else if (response.status === 404) {
    console.error('❌ Book not found')
  }

  // 设置为空数组，避免页面崩溃
  if (!append) {
    setWords([])
    setTotalWords(0)
  }
  return
}
```

### 3. 客户端层面 ✅
**文件：`src/lib/apiClient.ts`**

创建了`authenticatedFetch`辅助函数：
```typescript
export async function getAccessToken(): Promise<string | null> {
  // 使用缓存避免频繁调用
  if (cachedToken && Date.now() < tokenExpireTime) {
    return cachedToken
  }

  const supabase = createClient(...)
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.access_token) {
    cachedToken = session.access_token
    tokenExpireTime = Date.now() + (50 * 60 * 1000)
    return session.access_token
  }

  return null
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()

  const headers: HeadersInit = {
    ...options.headers,
  }

  // 添加Authorization header
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'  // 同时携带cookies
  })
}
```

**文件：`src/hooks/useWordData.ts`**

使用`authenticatedFetch`替代普通fetch：
```typescript
// 之前
const response = await fetch(`/api/words?${params}`, {
  credentials: 'include'
})

// 之后
const response = await authenticatedFetch(`/api/words?${params}`)
```

## 测试结果

### E2E测试结果
- ✅ 所有9个测试通过
- ⚠️ 仍显示"第1页加载了 0 个单词"

### 诊断测试结果
```
1️⃣ 检查用户... ✅
   ID: 00c6d4a2-34bd-4187-bf52-c346f8bf3500
   book_permissions: [ '*' ]

2️⃣ 检查book... ✅
   is_official: true
   total_words: 5862

3️⃣ 检查chapters... ✅
   找到 1 个chapters

4️⃣ 检查words... ✅
   找到 5 个words
   所有words都有正确的book_id

5️⃣ 测试RPC函数... ✅
   RPC成功，返回 5 个words

6️⃣ 测试HTTP API... ❌
   Status: 401
   返回: {"error":"Unauthorized"}
```

## 问题所在

虽然我们已经：
1. ✅ 修复了数据库权限问题
2. ✅ 添加了双重认证支持（cookies + Authorization header）
3. ✅ 创建了`authenticatedFetch`辅助函数
4. ✅ 添加了详细的错误处理和日志

但是HTTP API仍然返回401，这说明**客户端Supabase client在SSR环境中无法正确访问localStorage来获取session**。

## 推荐的解决方案

### 方案1：服务端数据传递（推荐）⭐

在服务端组件中直接获取第一页的单词数据，传递给客户端组件：

```typescript
// src/app/library/[id]/page.tsx
export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()

  // ... 获取book和chapters ...

  // 🆕 在服务端获取第一页单词数据
  const initialWords = await getWordsForBook(id, user.id, 1, 21)

  return (
    <BookDetailPageClient
      book={book}
      chapters={chapters || []}
      user={user}
      initialWords={initialWords}  // 🆕 传递初始数据
    />
  )
}
```

优点：
- 完全绕过客户端认证问题
- 利用服务端的完整权限检查
- 减少客户端API调用，提升性能

### 方案2：Middleware自动注入Token

在middleware中自动将session token注入到请求头：

```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...)
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.access_token) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-auth-token', session.access_token)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}
```

然后在API中使用这个header。

### 方案3：使用Server Actions替代fetch

将单词获取逻辑改为Server Action：

```typescript
// app/actions/words.ts
'use server'

export async function getWordsForBook(bookId: string, page: number, pageSize: number) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // ... 获取words ...
  return words
}

// 客户端组件中
const words = await getWordsForBook(book.id, page, pageSize)
```

## 总结

### 已完成 ✅
1. 数据库权限修复：测试用户已分配`book_permissions: ['*']`
2. API认证增强：支持cookies + Authorization header双重认证
3. 客户端优化：创建`authenticatedFetch`辅助函数
4. 错误处理：添加详细的错误日志和处理逻辑

### 仍需解决 ⚠️
1. **主要问题**：客户端Supabase client在SSR环境中的session访问问题
2. **推荐方案**：使用方案1（服务端数据传递），这是最可靠和性能最好的解决方案

### 下一步行动
1. 实施方案1：在服务端获取初始单词数据
2. 测试验证单词数据是否正确显示
3. 如仍有问题，考虑方案2或方案3

---

**修复时间**：2026-01-14
**E2E测试通过率**：9/9 (100%)
**单词加载状态**：仍显示0个（需要实施推荐方案）
