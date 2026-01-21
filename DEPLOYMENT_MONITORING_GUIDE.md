# 部署和监控系统配置指南

> **Vercel + Sentry + UptimeRobot** 完整集成方案

---

## 📚 文档导航

- [快速开始](#快速开始)
- [Sentry 配置](#1-sentry-配置)
- [Vercel 部署](#2-vercel-部署)
- [UptimeRobot 配置](#3-uptimerobot-配置)
- [故障排查](#故障排查)

---

## 🚀 快速开始

### 预计时间

- **Sentry 配置**: 15 分钟
- **Vercel 部署**: 10 分钟
- **UptimeRobot 配置**: 5 分钟
- **总计**: 约 30 分钟

### 前置要求

- ✅ GitHub 账号（代码已推送）
- ✅ Sentry 账号（需注册）
- ✅ UptimeRobot 账号（需注册）
- ✅ Vercel 账号（需注册）

---

## 1. Sentry 配置

### 步骤 1.1: 注册 Sentry

1. 访问 https://sentry.io/
2. 点击 "Start Free Trial"
3. 使用 GitHub 账号登录（推荐）
4. 创建新组织（Organization）
   - 名称：`my-edu-platform`
5. 创建新项目
   - 平台选择：**Next.js**

### 步骤 1.2: 获取 DSN 和 Auth Token

**获取 DSN**:
```
Sentry Dashboard → [项目] → Settings → Client Keys (DSN)
复制: https://xxxxxxxxxxxxx@o1234.ingest.sentry.io/123456
```

**获取 Auth Token**:
```
Sentry Dashboard → Settings → Auth Tokens → Create New Token
勾选权限: project:releases, project:write
复制: sntrys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 步骤 1.3: 配置本地环境变量

在 `.env.local` 中添加：

```bash
# Sentry 配置
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxx@o1234.ingest.sentry.io/123456
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
```

### 步骤 1.4: 测试 Sentry

创建测试页面 `src/app/test-sentry/page.tsx`:

```typescript
"use client"

export default function TestSentryPage() {
  const triggerError = () => {
    throw new Error("Sentry 测试错误 - 这是正常的测试")
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sentry 测试页面</h1>
      <button
        onClick={triggerError}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        触发测试错误
      </button>
      <p className="mt-4 text-sm text-gray-600">
        点击按钮后，检查 Sentry Dashboard 是否收到错误
      </p>
    </div>
  )
}
```

访问：http://localhost:3000/test-sentry

**验证**：
- ✅ Sentry Dashboard 出现新错误
- ✅ 错误堆栈完整
- ✅ 浏览器和设备信息正确

---

## 2. Vercel 部署

### 步骤 2.1: 安装 Vercel CLI

```bash
npm install -g vercel
```

### 步骤 2.2: 登录 Vercel

```bash
vercel login
```

选择：
- ✅ 使用 GitHub 登录（推荐）

### 步骤 2.3: 创建项目

```bash
cd "D:\claude_work\yingyu\my-edu-platform"
vercel
```

按提示操作：
1. Link to existing project? → **No**
2. Project name → **my-edu-platform**
3. Directory → **./**
4. Override settings? → **Yes**
5. 选择区域 → **Hong Kong** (hkg1)

### 步骤 2.4: 配置环境变量

**方式 A: 通过 Vercel Dashboard**

1. 访问 https://vercel.com/dashboard
2. 选择项目 → Settings → Environment Variables
3. 添加以下变量：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Sentry
NEXT_PUBLIC_SENTRY_DSN=your-dsn
SENTRY_AUTH_TOKEN=your-token
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# Next.js
NODE_ENV=production
```

**方式 B: 通过 CLI**

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_SENTRY_DSN
vercel env add SENTRY_AUTH_TOKEN
```

### 步骤 2.5: 部署到生产环境

```bash
# 首次部署
vercel --prod

# 后续更新
git push origin master  # Vercel 自动部署
```

### 步骤 2.6: 验证部署

**检查项**：
- ✅ 访问 Vercel 提供的域名
- ✅ 测试登录功能
- ✅ 测试练习功能
- ✅ 检查 Sentry 是否有错误
- ✅ 检查 Vercel Analytics

**Vercel Dashboard**:
```
Deployments → 查看部署历史
Analytics → 查看访问统计
Logs → 查看实时日志
```

---

## 3. UptimeRobot 配置

### 步骤 3.1: 注册 UptimeRobot

1. 访问 https://uptimerobot.com/
2. 点击 "Sign Up"
3. 使用邮箱注册
4. 验证邮箱

### 步骤 3.2: 创建监控器

1. 登录 UptimeRobot
2. 点击 "Add New Monitor"
3. 配置如下：

```
Monitor Type: HTTP(s)
URL: https://your-vercel-domain.vercel.app
Check Interval: 5 minutes
Monitoring Locations:
  ✅ Hong Kong
  ✅ Tokyo
  ✅ Singapore
Alert Contacts:
  ✅ 您的邮箱
```

4. 点击 "Create Monitor"

### 步骤 3.3: 添加健康检查监控（推荐）

**API 健康检查端点**（已创建）:
```
URL: https://your-domain.com/api/health
```

这个端点会检查：
- 数据库连接状态
- 内存使用情况
- 返回 JSON 格式状态

### 步骤 3.4: 测试监控

1. 暂停监控器（Pause）
2. 等待 5-10 分钟
3. 检查是否收到告警邮件
4. 恢复监控器（Resume）

---

## 📊 监控系统总览

### 三层监控体系

```
┌─────────────────────────────────────────┐
│         用户访问                        │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       ↓                ↓
┌──────────────┐  ┌──────────────┐
│ UptimeRobot  │  │   Sentry     │
│ 可用性监控   │  │   错误监控   │
│              │  │              │
│ • 网站宕机   │  │ • JS 错误    │
│ • 响应时间   │  │ • API 错误   │
│ • 每 5 分钟  │  │ • 性能监控   │
└──────┬───────┘  └──────┬───────┘
       │                 │
       └────────┬────────┘
                ↓
         ┌──────────────┐
         │    Vercel    │
         │   部署平台   │
         │              │
         │ • 自动部署   │
         │ • 日志聚合   │
         │ • 性能分析   │
         └──────────────┘
```

### 问题定位流程

```
用户报告问题
    │
    ├─ 网站打不开？
    │   ├─ UptimeRobot 告警？
    │   │  └─ 是 → Vercel Dashboard 检查
    │   └─ 否 → 继续检查
    │
    ├─ 页面报错？
    │   └─ Sentry 查看错误堆栈
    │
    └─ 功能异常？
        ├─ Vercel Logs 查看后端日志
        └─ Sentry 查看前端错误
```

---

## 🔧 故障排查

### 问题 1: Sentry 没有收到错误

**可能原因**：
- DSN 配置错误
- 环境变量未设置
- 代码未正确初始化

**解决方法**：
```bash
# 1. 检查环境变量
cat .env.local | grep SENTRY

# 2. 检查浏览器控制台
# 查看是否有 Sentry 相关错误

# 3. 手动测试
# 访问 /test-sentry 触发错误
```

### 问题 2: Vercel 部署失败

**可能原因**：
- 环境变量未配置
- 构建错误
- 依赖安装失败

**解决方法**：
```bash
# 1. 本地测试构建
npm run build

# 2. 检查 Vercel 部署日志
# Vercel Dashboard → Deployments → 点击部署 → Logs

# 3. 重新部署
vercel --prod --force
```

### 问题 3: UptimeRobot 误报

**可能原因**：
- 服务器暂时繁忙
- 网络波动
- 检查间隔太短

**解决方法**：
```
1. 增加超时时间（默认 30 秒）
2. 选择更多监控位置
3. 只在多个位置都失败时才告警
```

---

## ✅ 部署检查清单

### 部署前

- [ ] 代码已推送到 GitHub
- [ ] Sentry 账号已注册
- [ ] UptimeRobot 账号已注册
- [ ] Vercel 账号已注册
- [ ] 所有环境变量已配置
- [ ] 本地测试通过

### 部署中

- [ ] Vercel 项目已创建
- [ ] 环境变量已添加到 Vercel
- [ ] 生产环境构建成功
- [ ] 域名可访问

### 部署后

- [ ] 网站功能正常
- [ ] Sentry 已收到测试错误
- [ ] UptimeRobot 监控正常
- [ ] Vercel Analytics 有数据
- [ ] 错误边界正常工作

---

## 📈 监控指标

### 关键指标

| 指标 | 目标值 | 监控工具 |
|------|--------|---------|
| 网站可用性 | > 99.9% | UptimeRobot |
| 错误率 | < 1% | Sentry |
| 页面加载时间 | < 2 秒 | Sentry + Vercel |
| API 响应时间 | < 500ms | Vercel Logs |

### 告警阈值

```javascript
// Sentry 告警规则
错误率 > 5% for 5 minutes → 发送邮件
新错误出现 → 发送 Slack
性能下降 → 发送通知

// UptimeRobot 告警
网站宕机 → 立即发送邮件
响应时间 > 3 秒 → 发送警告
```

---

## 🎯 下一步

部署完成后：

1. **观察监控**（1 周）
   - 每天检查 Sentry 错误趋势
   - 查看 UptimeRobot 运行时间
   - 观察 Vercel Analytics

2. **优化性能**
   - 根据 Sentry 性能报告优化
   - 根据 Vercel Analytics 优化加载速度

3. **扩展监控**
   - 需要时添加更多监控点
   - 配置更详细的告警规则
   - 集成更多告警渠道

---

## 📞 需要帮助？

- **Sentry 支持**: https://docs.sentry.io/
- **Vercel 支持**: https://vercel.com/docs
- **UptimeRobot 支持**: https://uptimerobot.com/getting-started

---

**文档版本**: v1.0
**最后更新**: 2026-01-21
**预计配置时间**: 30 分钟
