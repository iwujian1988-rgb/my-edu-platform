# 登录态丢失问题 - 详细现状报告

## 问题描述

用户登录后，生产环境进入单词列表页（`/library/[id]`）时，登录态立即丢失。

## 环境信息

- **生产环境**: `http://43.99.58.240` (HTTP)
- **本地开发**: `http://localhost:3001` (HTTP, but localhost)
- **技术栈**: Next.js 16.1.1, Supabase Auth, @supabase/ssr
- **部署方式**: PM2 on 阿里云轻量应用服务器

## 症状对比

### 本地开发环境（正常）
✅ 登录后有 **2个 cookies**:
- `sb-xxx-auth-token` (access_token)
- `sb-xxx-refresh-token` (refresh_token)

✅ 所有页面正常工作：
- 首页刷新正常
- 进入单词列表页正常
- 单词列表页翻页正常
- 单词列表页刷新正常

### 生产环境（异常）
❌ 登录后只有 **1个 cookie**:
- `sb-snnrjnpcmdsdlyldvvps-auth-token` (access_token)
- **缺少** `sb-xxx-refresh-token`

❌ 页面表现：
- ✅ 首页正常
- ✅ 设置页正常
- ✅ 单词书列表页正常
- ❌ **进入单词列表页（`/library/[id]`）后 cookies 立即消失**
- ❌ 消失后需要重新登录

## 关键差异分析

### 1. Cookie设置差异

**本地 (localhost)**:
```
sb-snnrjnpcmdsdlyldvvps-auth-token
__next_hmr_refresh_hash__ (2个cookies)
```

**生产 (43.99.58.240)**:
```
sb-snnrjnpcmdsdlyldvvps-auth-token (只有1个)
```

**关键发现**: 生产环境登录时 `refresh-token` cookie 就没有被设置。

### 2. API调用方式差异

**首页** (`src/components/DashboardContent.tsx`):
```typescript
fetch('/api/stats/mistakes')      // 普通fetch，不调用getSession()
fetch('/api/stats/today-new')      // 普通fetch，不调用getSession()
fetch('/api/recent-books')         // 普通fetch，不调用getSession()
```

**单词列表页翻页** (`src/hooks/useWordData.ts`):
```typescript
const response = await authenticatedFetch(`/api/words?${params}`)  // 调用getSession()
```

### 3. `authenticatedFetch` 实现

**文件**: `src/lib/apiClient.ts`

```typescript
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = await getAccessToken()  // ⚠️ 这里调用 getSession()

  const headers: HeadersInit = {
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
    signal: options.signal
  })
}

async function getAccessToken(): Promise<string | null> {
  const supabase = createBrowserClient()  // 使用 @supabase/ssr 的 createBrowserClient

  const { data: { session } } = await supabase.auth.getSession()  // ⚠️ 关键调用点

  if (session?.access_token) {
    return session.access_token
  }
  return null
}
```

## 核心问题分析

### 问题1: 为什么生产环境只有1个cookie？

**假设**: Supabase 的 `createBrowserClient` 在非localhost的HTTP环境下，对 `refresh-token` cookie 设置了 `secure: true`，浏览器拒绝接受。

**证据**:
- 本地 `localhost` 有2个cookies（正常）
- 生产环境只有1个cookie
- 差异在于域名（localhost vs IP地址）

**未确认**: 需要查看 `createBrowserClient` 的默认cookie配置

### 问题2: 为什么进入单词列表页cookies就消失？

**假设**: `authenticatedFetch` 调用 `getSession()` 时，Supabase 检测到 session 不完整（缺少 refresh-token），触发某种错误处理，清除了cookies。

**证据**:
- 首页不调用 `getSession()`，正常工作
- 单词列表页通过 `useWordData` hook 使用 `authenticatedFetch`
- cookies "进去就没了"，说明是页面加载时立即清除的

**未确认**:
- 是在哪个具体时刻清除的？
- 是否有其他地方也调用了 `getSession()`？

## 已尝试的解决方案

### 尝试1: 修改 `apiClient.ts` 使用正确的客户端
**文件**: `src/lib/apiClient.ts`
**修改**: 从 `@supabase/supabase-js` 改为 `@/lib/supabase/client` (createBrowserClient)
**结果**: ❌ 问题依然存在

### 尝试2: 为 `createBrowserClient` 添加自定义cookie配置
**文件**: `src/lib/supabase/client.ts`
**修改内容**:
```typescript
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // 自定义读取逻辑
        },
        set(name: string, value: string, options: any) {
          // 自定义设置逻辑，强制 secure: false
        },
        remove(name: string, options: any) {
          // 自定义删除逻辑
        }
      }
    }
  )
}
```
**结果**:
- ❌ 生产环境还是只有1个cookie
- ❌ 进入单词列表页还是丢失cookies

### 尝试3: 回退自定义cookie配置
**修改**: 移除所有自定义cookies配置，使用Supabase默认行为
**结果**: ❌ 问题依然存在

## 当前代码状态

### 登录流程
**文件**: `src/app/login/LoginFormClient.tsx`

```typescript
const supabase = createClient()  // 来自 @/lib/supabase/client
const email = `${loginData.phone}@phone.xiaoyu.com`

const { data, error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password: loginData.password,
})

// 登录成功后
const checkBanResponse = await fetch('/api/auth/check-ban', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
})

router.push(targetUrl)
```

### Cookie配置

#### 服务端 (middleware.ts)
```typescript
const supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        const cookieOptions = {
          ...options,
          secure: false,  // 🔧 HTTP环境必须为false
          sameSite: 'lax',
        }
        request.cookies.set({ name, value, ...cookieOptions })
        response.cookies.set({ name, value, ...cookieOptions })
      },
      // ... remove方法
    }
  }
)
```

#### 客户端 (client.ts)
```typescript
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
// ⚠️ 没有自定义cookies配置，使用Supabase默认行为
```

## 待确认的问题

1. **`createBrowserClient` 的默认cookie配置是什么？**
   - 是否对refresh-token设置了`secure: true`？
   - 是否在不同域名下有不同行为？

2. **是在哪个具体时刻清除cookies的？**
   - 是页面加载时？
   - 是首次渲染时？
   - 是某个useEffect触发时？

3. **是否有其他地方也调用了 `getSession()`？**
   - 需要全局搜索 `auth.getSession()`
   - 需要检查所有客户端组件

4. **Middleware对 `/library/[id]` 路径是否有特殊处理？**
   - 需要检查middleware日志
   - 需要确认response中的cookies

## 建议的排查方向

### 方向1: 添加调试日志
在关键位置添加console.log：
1. `LoginFormClient` - 登录成功后查看设置了哪些cookies
2. `authenticatedFetch` - 查看是否被调用，返回了什么
3. `getAccessToken` - 查看session的状态
4. Middleware - 查看`/library/[id]`请求的cookies和response

### 方向2: 网络层面分析
1. 浏览器F12 → Network，查看登录响应的Set-Cookie headers
2. 对比本地和生产的Set-Cookie headers差异
3. 查看进入单词列表页时的网络请求

### 方向3: 检查Supabase配置
1. 查看Supabase项目的cookie设置
2. 检查是否有域名相关的配置
3. 确认HTTP环境的配置要求

### 方向4: 绕过方案（临时）
修改 `authenticatedFetch`，不调用 `getSession()`：
```typescript
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include',  // 只携带cookies，不添加Authorization header
    signal: options.signal
  })
}
```
**风险**:
- 治标不治本
- 可能有其他地方也会调用 `getSession()`
- Token过期后无法刷新

## 关键文件清单

1. `src/app/login/LoginFormClient.tsx` - 登录逻辑
2. `src/lib/supabase/client.ts` - 客户端Supabase实例
3. `src/lib/supabase/server.ts` - 服务端Supabase实例
4. `src/lib/apiClient.ts` - authenticatedFetch实现
5. `src/middleware.ts` - Next.js中间件
6. `src/hooks/useWordData.ts` - 单词列表数据获取（使用authenticatedFetch）
7. `src/app/library/[id]/page.tsx` - 单词列表页服务端组件
8. `src/components/BookDetailPageClient.tsx` - 单词列表页客户端组件

## 日志信息

### Middleware日志 (生产环境)
```
🔍 [Middleware Debug] {
  pathname: '/library/f4084a30-f07e-44aa-afe9-70a6400fa62a',
  hasUser: true,
  userId: '7078b0aa-d06a-4209-b669-1a0d4985c8ea',
  authCookiesCount: 1,  // ⚠️ 只有1个auth cookie
  error: undefined
}
```

### 服务端日志
```
📖 [Server Page] URL params - status: all, page: 1
📖 [Server] Fetching words for book f4084a30-f07e-44aa-afe9-70a6400fa62a, page 1, status all
🔍 [Server] Trying optimized RPC...
✅ [Server] RPC returned 21 words
✅ [Server] Returning 21 words (total: 3481)
📖 [Server Page] Passing 21 initial words to client
```

**服务端没有报错**，说明：
- 服务端渲染正常
- RPC调用成功
- 数据获取成功

## Git提交历史

最近相关的提交：
```
b1cd293 fix: 为 createBrowserClient 添加显式 cookie 配置
e21e2c9 revert: 移除 createBrowserClient 的自定义 cookie 配置
0b4f8b3 fix: 修复单词列表页翻页登录态丢失问题
14cb4b9 fix: 改用客户端登录（绕过Next.js Route Handler cookie问题）
```

## 总结

**核心问题**: 生产环境登录后只设置了1个cookie（auth-token），缺少refresh-token，导致Supabase认为session不完整，在某些操作（如调用`getSession()`）时清除了cookies。

**关键差异**: 本地环境（localhost）正常，生产环境（IP地址）异常，说明问题与域名环境相关。

**未解决的疑问**:
1. 为什么 `createBrowserClient` 在生产环境不设置 refresh-token？
2. 是什么操作触发了cookies清除？
3. 是在哪个具体时刻清除的？

**需要的信息**:
1. 生产环境登录时的Set-Cookie headers（F12 Network）
2. 进入单词列表页时的Network请求
3. 浏览器Console的错误信息

---

**报告时间**: 2025-01-22
**问题持续时间**: 1天+
**优先级**: 高（影响核心功能）
