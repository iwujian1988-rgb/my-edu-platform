# Supabase Auth Cookie Issue - 完整分析报告

## 问题描述

### 症状
- **生产环境**（https://maxnote.top）：用户登录后，访问 `/library`（词库列表页）正常，但点击进入 `/library/[id]`（单词列表页）时会丢失登录态，被重定向到登录页
- **本地环境**（localhost:3000）：完全正常，所有页面都可以无缝访问

### 环境
- **框架**: Next.js 16.1.1 (App Router)
- **认证**: Supabase Auth
  - `@supabase/ssr` (v0.8.0)
  - `@supabase/supabase-js` (v2.89.0)
- **部署**:
  - Alibaba Cloud Linux
  - Nginx 反向代理 + Let's Encrypt SSL 证书
  - PM2 进程管理

## 代码结构

### 涉及的关键页面

#### 1. `/library/page.tsx` - 词库列表页
```typescript
export default async function LibraryPage() {
  const user = await getCurrentUser()

  if (!user) {
    return null  // 🔍 静默失败，返回 null
  }
  // ... 加载词库数据
}
```

#### 2. `/library/[id]/page.tsx` - 单词列表页
```typescript
export default async function BookDetailPage({ params }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=' + encodeURIComponent(`/library/${id}`))  // 🔍 强制重定向到登录页
  }
  // ... 加载单词数据
}
```

#### 3. `/lib/supabase/server.ts` - 服务端 Supabase 客户端
```typescript
export async function createClient() {
  const cookieStore = await cookies()
  const isHttps = process.env.NODE_ENV === 'production'

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({
            name,
            value,
            ...options,
            secure: isHttps,  // 生产环境为 true
            sameSite: 'lax',
          })
        },
        // ...
      },
    }
  )
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  console.log('👤 [getCurrentUser] Result:', {
    hasUser: !!user,
    userId: user?.id,
    error: error?.message
  })

  if (error || !user) {
    return null
  }
  return user
}
```

#### 4. `/lib/supabase/client.ts` - 浏览器端 Supabase 客户端
```typescript
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### 5. `/middleware.ts` - Next.js 中间件
```typescript
const protectedRoutes = [
  '/dashboard',
  '/study',
  '/books',
  '/practice',
  '/mistakes',
  '/calendar',
  '/profile',
  '/custom',
  // 🔍 注意：'/library' 不在这个列表中
]

export async function middleware(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') || request.url.split('://')[0]
  const isHttps = protocol === 'https'

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
            secure: isHttps,
            sameSite: 'lax',
          }
          request.cookies.set({ name, value, ...cookieOptions })
          response.cookies.set({ name, value, ...cookieOptions })
        },
        // ...
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 检查受保护路由
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
```

## 服务端日志分析

### Cookie 读取日志
```
🍪 [Server Client] Detailed cookie info: {
  total: 1,
  sbCookies: [{
    name: 'sb-snnrjnpcmdsdlyldvvps-auth-token',
    hasValue: true,
    valueLength: XXX,  // 待确认
    valueStart: 'base64-...'
  }],
  authCookieFound: true,
  authCookieValueLength: XXX,
  isHttps: true
}

🔍 [Server Client] Reading cookie: sb-snnrjnpcmdsdlyldvvps-auth-token, found: true
🔍 [Server Client] Reading cookie: sb-snnrjnpcmdsdlyldvvps-auth-token.0, found: false
🔍 [Server Client] Reading cookie: sb-snnrjnpcmdsdlyldvvps-auth-token.1, found: false
🔍 [Server Client] Reading cookie: sb-snnrjnpcmdsdlyldvvps-auth-token.2, found: false
🔍 [Server Client] Reading cookie: sb-snnrjnpcmdsdlyldvvps-auth-token.3, found: false
🔍 [Server Client] Reading cookie: sb-snnrjnpcmdsdlyldvvps-auth-token.4, found: false

👤 [getCurrentUser] Result: {
  hasUser: false,
  userId: undefined,
  error: 'Auth session missing!',
  errorName: 'AuthSessionMissingError'
}
```

### 关键发现
1. ✅ Cookie 存在：`sb-snnrjnpcmdsdlyldvvps-auth-token`
2. ❌ 没有分片 cookie（`.0`, `.1`, `.2` 等）
3. ❌ `getUser()` 返回 `Auth session missing!` 错误

## Cookie 分片机制说明

根据 `@supabase/ssr` 源码分析：

### 分片逻辑 (`node_modules/@supabase/ssr/src/utils/chunker.ts`)
```typescript
export const MAX_CHUNK_SIZE = 3180

export function createChunks(key: string, value: string, chunkSize?: number): Chunk[] {
  const resolvedChunkSize = chunkSize ?? MAX_CHUNK_SIZE
  let encodedValue = encodeURIComponent(value)

  if (encodedValue.length <= resolvedChunkSize) {
    return [{ name: key, value }]  // 🔍 不需要分片
  }

  // 🔍 超过大小限制，创建分片
  const chunks: string[] = []
  while (encodedValue.length > 0) {
    // ... 分片逻辑
  }

  return chunks.map((value, i) => ({ name: `${key}.${i}`, value }))
}
```

### 合并逻辑
```typescript
export async function combineChunks(key: string, retrieveChunk) {
  const value = await retrieveChunk(key)
  if (value) {
    return value  // 🔍 如果主 cookie 存在，直接返回
  }

  // 🔍 如果主 cookie 不存在，尝试读取分片
  let values: string[] = []
  for (let i = 0; ; i++) {
    const chunkName = `${key}.${i}`
    const chunk = await retrieveChunk(chunkName)
    if (!chunk) break
    values.push(chunk)
  }

  return values.length > 0 ? values.join("") : null
}
```

### 结论
- **单个 cookie 理论上应该可以工作**（如果值 <= 3180 字节）
- `combineChunks()` 会优先读取主 cookie
- 只有主 cookie 不存在时才会读取分片

## 已尝试的解决方案

### 方案 1: 统一 `secure` 属性设置 ✅ (已部署，无效)

**问题描述**:
- `middleware.ts` 使用 `secure: isHttps` (动态)
- `server.ts` 原来强制 `secure: false`

**修改**:
```typescript
// server.ts
const isHttps = process.env.NODE_ENV === 'production'

cookieStore.set({
  name,
  value,
  ...options,
  secure: isHttps,  // 改为动态设置
  sameSite: 'lax',
  httpOnly: true,
})
```

**结果**: ❌ 无效，问题依然存在

**用户反馈**: 问题在配置 HTTPS 证书之前就存在，所以 `secure` 属性不是根本原因

### 方案 2: 检查 Cookie 分片 (进行中)

**假设**: Cookie 值可能过大，需要分片但没有正确创建

**当前状态**: 已添加详细日志，等待用户访问页面获取实际 cookie 长度

## 待验证的假设

### 假设 1: Cookie 值损坏或无效
**可能性**: ⭐⭐⭐⭐⭐

**说明**:
- Cookie 存在但值可能被截断、损坏或格式错误
- Supabase 无法解析这个 token

**验证方法**:
1. 查看 cookie 的实际长度
2. 对比本地和生产环境的 cookie 值
3. 检查 Nginx 是否有 `large_client_header_buffers` 限制

### 假设 2: Cookie Domain/Path 不匹配
**可能性**: ⭐⭐⭐⭐

**说明**:
- 本地: `localhost` → 所有路径共享 cookie
- 生产: 可能 domain 设置为 `.maxnote.top` 或 `maxnote.top`
- Cookie 的 `path` 属性可能不一致

**验证方法**:
1. 检查浏览器开发者工具中的 cookie 详细属性
2. 确认 cookie 的 domain 和 path

### 假设 3: Nginx 配置问题
**可能性**: ⭐⭐⭐

**说明**:
- Nginx 可能有 header 大小限制
- Cookie 传输过程中被截断或修改

**验证方法**:
1. 检查 Nginx 配置
   ```nginx
   large_client_header_buffers 4 16k;
   ```
2. 查看是否有其他 header 相关限制

### 假设 4: Next.js 静态资源缓存问题
**可能性**: ⭐⭐

**说明**:
- `/library` 可能被缓存为静态页面
- `/library/[id]` 是动态路由，总是服务端渲染

**反驳**:
- 两个页面都设置了 `dynamic = 'force-dynamic'`
- 两个页面都调用 `getCurrentUser()`

### 假设 5: Supabase Session 过期或无效
**可能性**: ⭐⭐⭐⭐

**说明**:
- Session 可能在服务端已过期
- Token 签名验证失败

**验证方法**:
1. 检查 Supabase Dashboard 中的用户 session
2. 对比本地和生产环境的 access token

## 疑问点

### 1. 为什么 `/library` 页面可以正常访问？
**可能性**:
- `getCurrentUser()` 也返回 `null`，但 `return null` 后客户端有兜底逻辑
- 客户端组件 `LibraryClient` 使用 `createBrowserClient()` 从浏览器本地读取 session

**需要验证**: `LibraryClient` 是否有客户端认证逻辑

### 2. 为什么本地环境完全正常？
**差异**:
- 本地: HTTP, localhost
- 生产: HTTPS, maxnote.top

**可能原因**:
- Cookie 的 `secure` 和 `domain` 属性差异
- 浏览器对 localhost 和第三方域的 cookie 策略不同

## 已尝试的解决方案（详细记录）

### 方案 1: 统一 `secure` 属性设置 ❌ (2026-01-22)

**问题描述**:
- `middleware.ts` 使用 `secure: isHttps` (动态根据协议)
- `server.ts` 原来强制 `secure: false`

**修改内容**:
```typescript
// server.ts
const isHttps = process.env.NODE_ENV === 'production'

cookieStore.set({
  name,
  value,
  ...options,
  secure: isHttps,  // 改为动态设置
  sameSite: 'lax',
  httpOnly: true,
})
```

**结果**: ❌ 无效，问题依然存在

**用户反馈**: 问题在配置 HTTPS 证书之前就存在，所以 `secure` 属性不是根本原因

---

### 方案 2: 阻止服务端删除 Cookie ❌ (2026-01-22)

**问题描述**:
日志显示 Supabase 客户端在尝试删除 auth-token cookie：
```
🚨 [createClient] ATTEMPTING TO REMOVE COOKIE: sb-snnrjnpcmdsdlyldvvps-auth-token
```

**修改内容**:
```typescript
// server.ts - remove 方法
remove(name: string, options: any) {
  try {
    // 🔍 Debug: 记录所有 cookie 删除操作
    if (name.includes('sb-')) {
      console.log('🚨 [createClient] ATTEMPTING TO REMOVE COOKIE:', name)
      console.trace('🚨 Cookie removal call stack:')
    }

    // 🔧 临时阻止删除 auth-token 相关的 cookies
    if (name.includes('auth-token')) {
      console.log('🛑 [createClient] BLOCKED removal of auth cookie:', name)
      return  // 阻止删除
    }

    cookieStore.set({
      name,
      value: '',
      ...options,
      secure: isHttps,
    })
  } catch (error) {
    console.error('[createClient] Failed to remove cookie:', name, 'error:', error)
  }
}
```

**结果**: ❌ 无效

**日志输出**:
```
🛑 [createClient] BLOCKED removal of auth cookie: sb-snnrjnpcmdsdlyldvvps-auth-token
🍪 [Server Client] Detailed cookie info: {
  valueLength: 3066,  // cookie 还在
}
```

**发现**: 服务端虽然阻止了删除，但**浏览器的 cookie 还是不见了**

**结论**: 问题不是服务端删除，而是**客户端 Supabase SDK 在收到服务端错误后自动删除了无效的 session**

---

### 方案 3: 获取 Cookie 详细信息并解码 Token ❌ (2026-01-22)

**问题描述**:
需要查看 cookie 的实际内容和 token 是否有效

**修改内容**:
```typescript
// server.ts - 解码 token
let decodedToken = null
if (authCookie?.value) {
  try {
    const base64Value = authCookie.value.replace('base64-', '')
    decodedToken = JSON.parse(Buffer.from(base64Value, 'base64').toString())
  } catch (e) {
    console.error('Failed to decode token:', e.message)
  }
}

console.log('🍪 [Server Client] Detailed cookie info:', {
  authCookieValueLength: authCookie?.value?.length || 0,
  decodedToken: decodedToken ? {
    hasAccessToken: !!decodedToken.access_token,
    hasRefreshToken: !!decodedToken.refresh_token,
    expiresAt: decodedToken.expires_at,
    tokenLength: decodedToken.access_token?.length
  } : null
})
```

**结果**: ⚠️ 部署了但未获得有效日志（用户测试时 cookie 已消失）

---

### 方案 4: 对比本地和生产环境的 Cookie ⚠️ (2026-01-22)

**问题描述**:
用户说本地环境完全正常，需要找出两个环境的差异

**用户提供的 Cookie 信息**:

**本地环境** (`localhost:3001`):
```
Name: sb-snnrjnpcmdsdlyldvvps-auth-token
Domain: localhost
Path: /
Size: 3099 bytes
Expires: 2027-02-26T17:25:36.596Z
Secure: (未显示，应该为空)
```

**生产环境** (`maxnote.top`):
```
Name: sb-snnrjnpcmdsdlyldvvps-auth-token
Domain: maxnote.top
Path: /
Size: 3100 bytes
Expires: 2027-02-26T17:28:28.145Z
SameSite: Lax
Secure: ❌ 为空（未勾选）
```

**关键发现**:
- ✅ Cookie 长度正常（3099 vs 3100），不是分片问题
- ✅ Token 未过期（2027年）
- ✅ Domain 正确（没有前导点）
- ❌ **生产环境的 `Secure` 列为空（未勾选）**

---

### 方案 5: 修复客户端 Cookie 的 Secure 属性 ❌ (2026-01-22)

**问题描述**:
生产环境是 HTTPS，但 cookie 的 `Secure` 属性为 `false`，导致浏览器在 HTTPS 页面上拒绝发送这个 cookie

**问题根源分析**:
```typescript
// node_modules/@supabase/ssr/src/utils/constants.ts
export const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  sameSite: "lax",
  httpOnly: false,
  maxAge: 400 * 24 * 60 * 60,
  // ❌ 没有 secure 属性！
}
```

**@supabase/ssr 的默认配置没有设置 `secure`**，导致默认为 `false`

**修改内容**:
```typescript
// client.ts - createClient()
export function createClient() {
  // 🔧 Fix: 在 HTTPS 环境下必须设置 secure: true
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        secure: isHttps,  // HTTPS 环境为 true
      },
    }
  )
}

// client.ts - getBrowserClient()
export function getBrowserClient() {
  if (!browserClientInstance) {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'

    browserClientInstance = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: {
          secure: isHttps,
        },
      }
    )
  }
  return browserClientInstance
}
```

**理论预期**:
- 本地环境 (HTTP): `secure: false` ✅
- 生产环境 (HTTPS): `secure: true` ✅

**测试结果**: ❌ 还是需要重新登录

**用户反馈**:
1. 退出登录后重新登录
2. 检查 cookie，发现 `Secure` 列**仍然为空**
3. 进入单词列表页还是需要重新登录

**可能的原因**:
1. 浏览器缓存了旧的 JavaScript 代码，没有执行新的逻辑
2. `cookieOptions` 配置没有正确传递到 `@supabase/ssr`
3. 需要清除浏览器缓存和 localStorage
4. 或者有其他地方在覆盖这个设置

---

## 当前状态 (2026-01-22)

### 已确认的事实
1. ✅ Cookie 本身正常（长度、格式、过期时间都正确）
2. ✅ 服务端能读取到 cookie（valueLength: 3066）
3. ✅ 服务端阻止了删除操作
4. ❌ 但 `getUser()` 还是返回 `Auth session missing!`
5. ❌ 浏览器的 cookie 最终还是消失
6. ❌ **生产环境的 cookie 缺少 `Secure` 属性**

### 核心矛盾
- **本地环境** (HTTP): `secure: false` → 正常工作
- **生产环境** (HTTPS): `secure: false` → 不工作
- 即使修改客户端代码设置 `secure: true`，cookie 的 `Secure` 列还是为空

### 下一步计划

1. **验证客户端代码是否生效**
   - 检查浏览器是否加载了新的 JavaScript 代码
   - 可能需要清除浏览器缓存或硬刷新 (Ctrl+Shift+R)
   - 在登录时添加 console.log，确认 `isHttps` 的值

2. **检查 Supabase 项目配置**
   - 登录 Supabase Dashboard
   - 检查 Project Settings → Auth → URL Configuration
   - 确认 Site URL 是否设置为 `https://maxnote.top`
   - 检查 Redirect URLs 是否包含正确的 HTTPS 地址

3. **尝试手动设置 Cookie 属性**
   - 不依赖 `@supabase/ssr` 的默认配置
   - 在 middleware 中手动添加 `Secure` 属性到已存在的 cookies

4. **检查是否有多个登录入口**
   - 可能 `/register` 或其他登录入口没有使用新的客户端代码
   - 确保所有登录入口都使用相同的 `createClient()`

5. **联系 Supabase 支持**
   - 这可能是 `@supabase/ssr` 在 HTTPS 环境下的 bug
   - 查看是否有其他用户报告类似问题

## 相关链接

- [Supabase SSR Advanced Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Next.js Middleware with Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Cookie 分片源码](https://github.com/supabase/ssr/blob/main/src/utils/chunker.ts)
- [Supabase GitHub Issues](https://github.com/supabase/supabase/issues)
