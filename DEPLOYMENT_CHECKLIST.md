# 阿里云香港部署检查清单

## 部署前准备

### 1. 移除代理配置

**方式 A：完全删除代理代码（推荐）**

编辑 `next.config.ts`：

```typescript
import type { NextConfig } from "next";

// ❌ 删除整个代理配置块
// if (process.env.NODE_ENV === 'development') {
//   const { setGlobalDispatcher, ProxyAgent } = require('undici')
//   const agent = new ProxyAgent('http://127.0.0.1:7890')
//   setGlobalDispatcher(agent)
//   console.log('[Proxy] 全局 fetch 代理已启用 -> http://127.0.0.1:7890')
// }

const nextConfig: NextConfig = {
  // ... 原有配置保持不变
}

export default nextConfig
```

**方式 B：保留代码但通过环境变量控制**

如果你想保留代码以便将来需要：

```typescript
import type { NextConfig } from "next";

// 只在开发环境且显式启用时生效
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

然后在生产环境**不设置** `ENABLE_PROXY` 环境变量。

### 2. 验证环境变量

确保 `.env.production` 或服务器环境变量中：

```bash
# ✅ Supabase 配置（必需）
NEXT_PUBLIC_SUPABASE_URL=https://snnrjnpcmdsdlyldvvps.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon_key
SUPABASE_SERVICE_ROLE_KEY=你的service_role_key

# ❌ 不要设置以下变量（生产环境不需要代理）
# ENABLE_PROXY=undefined  # 不设置或注释掉
# PROXY_URL=undefined     # 不设置或注释掉
```

### 3. 确认依赖

`package.json` 中 `undici` 依赖可以保留（不会影响生产环境）：

```json
{
  "dependencies": {
    "undici": "^7.0.0"  // ✅ 可以保留
  }
}
```

---

## 部署步骤

### 步骤 1：构建项目

```bash
# 本地执行
npm run build
```

**验证：**
- ✅ 构建成功，无错误
- ✅ 没有看到 `[Proxy] 全局 fetch 代理已启用` 日志

### 步骤 2：上传到服务器

```bash
# 上传以下内容到阿里云香港服务器
- .next/           # 构建输出
- public/          # 静态资源
- package.json
- package-lock.json
- node_modules/    # 或在服务器上运行 npm install --production
- .env.production  # 环境变量（注意安全！）
- next.config.ts   # 配置文件
```

### 步骤 3：服务器上安装依赖

```bash
# SSH 连接到阿里云香港服务器
ssh your-server

# 安装依赖
npm install --production

# 或使用 pnpm
pnpm install --production
```

### 步骤 4：启动应用

```bash
# 使用 PM2（推荐）
pm2 start npm --name "my-edu-platform" -- start

# 或直接运行
npm start
```

---

## 部署后验证

### 1. 检查应用日志

```bash
# PM2 日志
pm2 logs my-edu-platform

# 或直接查看应用输出
```

**预期结果：**
- ✅ 没有 `[Proxy] 全局 fetch 代理已启用` 日志
- ✅ Supabase 连接成功（HTTP 200 响应）
- ✅ 页面正常加载

### 2. 测试关键功能

**测试清单：**

- [ ] 首页加载：`https://your-domain.com/`
- [ ] 登录功能：`https://your-domain.com/login`
- [ ] 登录后跳转到工作台
- [ ] 词库页面：`https://your-domain.com/library`
- [ ] 学习页面：`https://your-domain.com/study/[bookId]`

### 3. 性能检查

```bash
# 使用 curl 测试响应时间
curl -I https://your-domain.com/ -w "\nTime: %{time_total}s\n"
```

**预期结果：**
- 首页加载时间 < 2 秒
- API 响应时间 < 1 秒

---

## 常见问题

### Q1: 部署后页面还是超时？

**检查项：**
1. ✅ 阿里云安全组是否允许出站 HTTPS（443端口）
2. ✅ Supabase URL 是否正确
3. ✅ 环境变量是否正确设置

**解决方案：**
```bash
# 服务器上测试 Supabase 连接
curl -I https://snnrjnpcmdsdlyldvvps.supabase.co --connect-timeout 5
```

如果连接成功，说明网络正常，检查应用配置。

### Q2: 登录成功但不跳转？

**检查 `middleware.ts`：**
- ✅ 确保没有在开头直接 `return`
- ✅ 确保原版 middleware 被恢复

### Q3: 如何确认是否走了代理？

**检查日志：**
- ✅ 如果看到 `[Proxy] 全局 fetch 代理已启用` → 走了代理（开发环境）
- ✅ 如果没有看到此日志 → 没走代理（生产环境正确）

---

## 回滚方案

如果生产环境部署后发现问题需要回滚：

### 方案 1：启用代理模式

```bash
# 在服务器环境变量中添加
export ENABLE_PROXY='true'
export PROXY_URL='http://your-proxy-server:7890'

# 重启应用
pm2 restart my-edu-platform
```

### 方案 2：切换到备用服务器

如果主服务器无法访问 Supabase：
1. 部署到国内节点
2. 配置代理服务器
3. 设置 `ENABLE_PROXY='true'`

---

## 性能优化建议

### 阿里云香港节点优化

1. **启用 CDN** - 加速静态资源访问
2. **配置 Redis** - 缓存 API 响应
3. **数据库连接池** - 减少 Supabase 查询次数

### Supabase 优化

1. **使用 Row Level Security** - 减少服务端过滤
2. **添加数据库索引** - 加速查询
3. **启用 Supabase Edge Functions** - 减少往返次数

---

## 监控和日志

### 推荐工具

- **PM2** - 进程管理和日志
- **Sentry** - 错误追踪
- **New Relic** - 性能监控
- **Supabase Dashboard** - 数据库查询分析

### 关键指标

- 页面加载时间
- API 响应时间
- 错误率
- Supabase 查询次数

---

## 快速命令参考

```bash
# 构建项目
npm run build

# 本地测试生产版本
npm run start

# 上传到服务器
rsync -avz ./ user@server:/var/www/my-edu-platform/

# 服务器上安装依赖
ssh user@server "cd /var/www/my-edu-platform && npm install --production"

# 重启应用
pm2 restart my-edu-platform

# 查看日志
pm2 logs my-edu-platform --lines 100
```

---

**文档版本：** v1.0
**更新日期：** 2026-01-17
**适用环境：** 阿里云香港 ECS
