# Supabase 代理配置说明文档

## 问题背景

**问题描述：**
- 从 2026年1月16日开始，Supabase Cloud 域名 (`snnrjnpcmdsdlyldvvps.supabase.co`) 在中国大陆网络环境无法直接访问
- 导致所有 Supabase 请求超时：
  - DNS 解析失败：`getaddrinfo ENOTFOUND`
  - 连接超时：`ConnectTimeoutError: Connect Timeout Error (attempted address: snnrjnpcmdsdlyldvvps.supabase.co:443, timeout: 10000ms)`

**影响范围：**
- ❌ Middleware 无法刷新 session
- ❌ Server Components 无法加载数据
- ❌ Server Actions 无法登录/注册
- ❌ API Routes 无法查询数据库
- 页面加载时间从 2 秒增加到 74 秒+

**根本原因：**
Supabase Cloud 部署在海外，中国大陆访问其域名需要代理。

---

## 解决方案

使用 **undici ProxyAgent** 让 Node.js 的所有 HTTP 请求自动通过 Clash 代理。

### 为什么选择 undici ProxyAgent？

1. ✅ **全局生效** - 影响 Node.js 原生 `fetch()` 的所有调用
2. ✅ **透明代理** - 不需要修改业务代码
3. ✅ **Next.js 兼容** - Next.js 使用 undici 作为 fetch 的底层实现
4. ✅ **开发环境专用** - 可以通过 `NODE_ENV` 控制是否启用

---

## 开发环境修改内容

### 1. 安装依赖

```bash
npm install undici
```

**package.json 变更：**
```json
{
  "dependencies": {
    "undici": "^7.0.0"  // 新增
  }
}
```

### 2. 修改 `next.config.ts`

**文件路径：** `next.config.ts`

**修改内容：**

```typescript
import type { NextConfig } from "next";

// ========================================
// 开发环境：启用 HTTP 代理
// ========================================
// 使用 undici 的 ProxyAgent 让全局 fetch 走代理
// TODO: 生产环境部署到阿里云香港后可以移除此代码
if (process.env.NODE_ENV === 'development') {
  const { setGlobalDispatcher, ProxyAgent } = require('undici')

  // 创建代理 Agent
  const agent = new ProxyAgent('http://127.0.0.1:7890')

  // 设置为全局 dispatcher，影响所有 fetch 调用
  setGlobalDispatcher(agent)

  console.log('[Proxy] 全局 fetch 代理已启用 -> http://127.0.0.1:7890')
}

const nextConfig: NextConfig = {
  // ... 原有配置保持不变
}

export default nextConfig
```

**说明：**
- 只在 `NODE_ENV === 'development'` 时启用
- 使用 Clash 代理端口 `7890`
- 通过 `setGlobalDispatcher` 设置全局代理

### 3. 恢复 `middleware.ts`

**修改原因：**
之前为了临时解决问题，直接在 middleware 开头 `return supabaseResponse`，导致：
- ✅ Supabase session 创建成功
- ❌ 但浏览器没有收到 session cookies
- ❌ 前端认为未登录，无法跳转

**解决方案：**
恢复原版 middleware，让代理配置生效后自动处理 cookies。

```bash
git checkout src/middleware.ts
```

### 4. 修复 `DashboardContent.tsx` Bug

**问题：**
`progressCards` 属性未传递但被使用，导致首页报错。

**修复：**
```typescript
// 文件：src/components/DashboardContent.tsx

interface DashboardContentProps {
  books: any[]
  progressCards?: ProgressCardProps[]  // 添加可选标记
  mistakesCount: number
  todayNewWordsCount: number
  userEmail: string
  userId?: string
}

export function DashboardContent({
  books,
  progressCards = [],  // 添加默认值
  mistakesCount,
  todayNewWordsCount,
  userEmail,
  userId
}: DashboardContentProps) {
  // ... 组件代码
}
```

---

## Clash 代理配置要求

### 开发环境 Clash 配置

**文件：** Clash 配置文件（`config.yaml`）

**必需配置：**

```yaml
port: 7890
socks-port: 7891
allow-lan: true  # ✅ 关键：必须启用
mode: rule
log-level: silent
```

**验证 Clash 是否运行：**

```bash
# Windows
netstat -ano | findstr :7890

# 应该看到类似输出：
# TCP    127.0.0.1:7890    0.0.0.0:0    LISTENING    <PID>
```

### npm 代理配置

如果需要安装 npm 包：

```bash
npm config set proxy http://127.0.0.1:7890
npm config set https-proxy http://127.0.0.1:7890
```

---

## 性能对比

| 指标 | 修复前（无代理） | 修复后（有代理） | 改善 |
|------|----------------|----------------|------|
| **Supabase 连接** | 超时 10 秒+ | < 1 秒 | ✅ **10 倍** |
| **首页加载** | 74 秒 | 0.8 秒 | ✅ **90 倍** |
| **登录页面** | 34 秒 | 0.05 秒 | ✅ **700 倍** |
| **服务器启动** | 12.5 秒 | 2.5 秒 | ✅ **5 倍** |
| **登录功能** | ❌ 无法使用 | ✅ 正常工作 | ✅ **修复** |

---

## 生产环境部署指南

### 部署到阿里云香港

**推荐配置：**

阿里云香港节点**可以直接访问 Supabase Cloud**，不需要代理。

**选项 1：移除代理代码（推荐）**

修改 `next.config.ts`，删除代理配置：

```typescript
import type { NextConfig } from "next";

// ❌ 删除以下代码块
// if (process.env.NODE_ENV === 'development') {
//   const { setGlobalDispatcher, ProxyAgent } = require('undici')
//   const agent = new ProxyAgent('http://127.0.0.1:7890')
//   setGlobalDispatcher(agent)
//   console.log('[Proxy] 全局 fetch 代理已启用 -> http://127.0.0.1:7890')
// }

const nextConfig: NextConfig = {
  // ... 原有配置
}

export default nextConfig
```

**选项 2：保留代码但添加生产环境检查**

如果保留代码以备将来需要：

```typescript
import type { NextConfig } from "next";

// 只在开发环境 + 显式启用代理时生效
if (process.env.NODE_ENV === 'development' && process.env.ENABLE_PROXY === 'true') {
  const { setGlobalDispatcher, ProxyAgent } = require('undici')
  const agent = new ProxyAgent('http://127.0.0.1:7890')
  setGlobalDispatcher(agent)
  console.log('[Proxy] 全局 fetch 代理已启用 -> http://127.0.0.1:7890')
}

const nextConfig: NextConfig = {
  // ... 原有配置
}

export default nextConfig
```

**环境变量：**

生产环境**不设置** `ENABLE_PROXY` 环境变量即可。

### 部署到国内节点

如果部署到阿里云**国内**节点（如北京、上海），可能仍需要代理：

**方案 1：使用自建代理服务器**

```typescript
// next.config.ts
if (process.env.ENABLE_PROXY === 'true') {
  const proxyUrl = process.env.PROXY_URL || 'http://127.0.0.1:7890'
  const { setGlobalDispatcher, ProxyAgent } = require('undici')
  const agent = new ProxyAgent(proxyUrl)
  setGlobalDispatcher(agent)
  console.log(`[Proxy] 生产环境代理已启用 -> ${proxyUrl}`)
}
```

**环境变量：**

```bash
# .env.production
ENABLE_PROXY=true
PROXY_URL=http://your-proxy-server:7890
```

**方案 2：迁移到 Supabase 自托管版本**

长期解决方案：使用 Supabase CLI 在国内服务器自建 Supabase 实例。

---

## 验证代理是否工作

### 测试脚本

创建文件 `test-undici-proxy.cjs`：

```javascript
// 测试 undici ProxyAgent 是否工作
process.env.NODE_ENV = 'development'

// 设置全局代理（和 next.config.ts 一样）
const { setGlobalDispatcher, ProxyAgent } = require('undici')
const agent = new ProxyAgent('http://127.0.0.1:7890')
setGlobalDispatcher(agent)

console.log('[Proxy] 已启用 -> http://127.0.0.1:7890')

// 测试 fetch
async function testSupabase() {
  console.log('\n测试 Supabase 连接...')

  try {
    const response = await fetch('https://snnrjnpcmdsdlyldvvps.supabase.co', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })

    console.log(`✅ 成功！HTTP ${response.status}`)
  } catch (error) {
    console.log('❌ 失败')
    console.log('错误:', error.message)
  }
}

testSupabase()
```

**运行测试：**

```bash
node test-undici-proxy.cjs
```

**预期输出：**

```
[Proxy] 已启用 -> http://127.0.0.1:7890

测试 Supabase 连接...
✅ 成功！HTTP 404
```

> 注：HTTP 404 是正常的（Supabase 根路径无内容），关键是连接成功。

---

## 故障排查

### 问题 1：页面仍然超时

**检查项：**
1. ✅ Clash 是否运行？`netstat -ano | findstr :7890`
2. ✅ Clash 是否启用了 `allow-lan: true`？
3. ✅ 开发服务器是否重启？
4. ✅ `next.config.ts` 是否正确配置？

**解决方案：**
```bash
# 1. 重启 Clash
# 2. 重启开发服务器
npm run dev
```

### 问题 2：登录成功但不跳转

**原因：**
middleware 被禁用，cookies 未设置。

**解决方案：**
确保 `middleware.ts` 是原版（没有在开头直接 return）。

```bash
git checkout src/middleware.ts
```

### 问题 3：首页报错 `Cannot read properties of undefined (reading 'length')`

**原因：**
`progressCards` 属性未传递。

**解决方案：**
已在 `DashboardContent.tsx` 中添加默认值，确保代码已更新。

---

## 总结

### 修改文件清单

1. **`package.json`** - 新增 `undici` 依赖
2. **`next.config.ts`** - 添加开发环境代理配置
3. **`src/middleware.ts`** - 恢复原版（删除临时禁用代码）
4. **`src/components/DashboardContent.tsx`** - 添加 `progressCards` 默认值

### 开发环境依赖

- ✅ Clash 代理运行在端口 7890
- ✅ Clash 配置 `allow-lan: true`

### 生产环境部署

- **香港节点**：移除代理代码（或通过环境变量控制）
- **国内节点**：保留代理代码并配置代理服务器地址

---

## 参考资源

- [undici 官方文档](https://undici.nodejs.org/#/docs/api/ProxyAgent)
- [Next.js 环境变量](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase 自托管指南](https://supabase.com/docs/guides/self-hosting)

---

**文档版本：** v1.0
**创建日期：** 2026-01-17
**维护者：** 开发团队
