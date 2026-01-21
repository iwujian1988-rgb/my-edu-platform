# 监控系统实施指南（详细步骤）

> **⚠️ 注意**：本文档仅提供实施步骤和代码示例，不自动执行任何操作。

---

## 📋 实施清单

### Phase 1: 安装依赖（5 分钟）
- [ ] 安装 Sentry SDK
- [ ] 安装 Pino 日志库
- [ ] 安装 Web Vitals 库

### Phase 2: 配置 Sentry（10 分钟）
- [ ] 注册 Sentry 账号
- [ ] 创建 Next.js 项目
- [ ] 配置环境变量
- [ ] 运行安装向导

### Phase 3: 实现前端监控（15 分钟）
- [ ] 配置 Sentry 客户端
- [ ] 添加错误边界
- [ ] 集成 Web Vitals

### Phase 4: 实现后端日志（20 分钟）
- [ ] 创建日志工具类
- [ ] 配置 Pino
- [ ] 添加日志中间件

### Phase 5: API 监控（15 分钟）
- [ ] 创建 API 监控中间件
- [ ] 添加请求追踪
- [ ] 记录响应时间

### Phase 6: 健康检查（10 分钟）
- [ ] 实现 /api/health 端点
- [ ] 添加数据库检查
- [ ] 添加资源监控

### Phase 7: 监控仪表板（30 分钟）
- [ ] 创建监控页面
- [ ] 添加错误图表
- [ ] 添加性能图表

**总耗时**：约 1.5-2 小时

---

## 📦 Phase 1: 安装依赖

### 步骤 1.1: 安装 npm 包

```bash
# 前端监控
npm install @sentry/nextjs

# 日志系统
npm install pino pino-pretty

# 性能监控
npm install web-vitals
```

### 步骤 1.2: 验证安装

```bash
npm list @sentry/nextjs pino web-vitals
```

---

## 🔧 Phase 2: 配置 Sentry

### 步骤 2.1: 注册 Sentry 账号

1. 访问 https://sentry.io/
2. 注册账号（免费）
3. 创建新项目
4. 选择 "Next.js" 平台

### 步骤 2.2: 获取 DSN

从 Sentry 项目设置中获取：
- **DSN** (Data Source Name)
- **Auth Token** (用于上传 source maps)

### 步骤 2.3: 配置环境变量

在 `.env.local` 中添加：

```bash
# Sentry 配置
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxx@o1234.ingest.sentry.io/123456
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

### 步骤 2.4: 运行 Sentry 向导

```bash
npx @sentry/wizard@latest -i nextjs
```

向导会自动：
1. 创建 `sentry.client.config.ts`
2. 创建 `sentry.server.config.ts`
3. 创建 `sentry.edge.config.ts`
4. 更新 `next.config.ts`
5. 创建 `.sentryclirc`

---

## 💻 Phase 3: 实现前端监控

### 步骤 3.1: 创建 Sentry 客户端配置

**文件**: `sentry.client.config.ts`

```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 环境
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "development",

  // 采样率
  tracesSampleRate: 1.0, // 开发环境 100%，生产环境建议 0.1-0.2
  replaysSessionSampleRate: 0.1, // 会话回放采样率
  replaysOnErrorSampleRate: 1.0, // 错误时会话回放 100%

  // 集成
  integrations: [
    new Sentry.BrowserTracing({
      // 性能追踪
      tracePropagationTargets: ["localhost", "yourdomain.com"],
    }),
    new Sentry.Replay({
      // 会话回放
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // 过滤敏感信息
  beforeSend(event, hint) {
    // 移除敏感数据
    if (event.request) {
      delete event.request.cookies
      delete event.request.headers
    }
    return event
  },

  // 过滤不需要的错误
  ignoreErrors: [
    "Non-Error promise rejection captured",
    "ResizeObserver loop limit exceeded",
  ],
})
```

### 步骤 3.2: 创建错误边界

**文件**: `src/app/error.tsx`

```typescript
"use client"

import { useEffect } from "react"
import { captureException } from "@sentry/nextjs"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 发送错误到 Sentry
    captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2>出错了！</h2>
        <p>错误已记录，我们会尽快修复</p>
        <button onClick={reset}>重试</button>
      </div>
    </div>
  )
}
```

### 步骤 3.3: 集成 Web Vitals

**文件**: `src/app/layout.tsx`

```typescript
"use client"

import { useReportWebVitals } from "next/web-vitals"

export function WebVitals() {
  useReportWebVitals((metric) => {
    // 发送到 Sentry
    const Sentry = require("@sentry/nextjs")

    Sentry.metrics().set(metric.name, metric.value, {
      unit: metric.value < 1000 ? "ms" : "",
      tags: {
        id: metric.id,
        delta: metric.delta,
        rating: metric.rating,
      },
    })

    // 或发送到自己的 API
    fetch("/api/analytics", {
      method: "POST",
      body: JSON.stringify(metric),
    })
  })

  return null
}
```

### 步骤 3.4: 测试前端错误捕获

创建测试页面：`src/app/test-sentry-error/page.tsx`

```typescript
"use client"

export default function TestSentryPage() {
  const triggerError = () => {
    throw new Error("这是 Sentry 测试错误")
  }

  return (
    <div>
      <h1>Sentry 错误测试</h1>
      <button onClick={triggerError}>触发错误</button>
    </div>
  )
}
```

访问：`http://localhost:3000/test-sentry-error`

---

## 📝 Phase 4: 实现后端日志

### 步骤 4.1: 创建日志工具类

**文件**: `src/lib/logger.ts`

```typescript
import pino from "pino"

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,

  // 生产环境使用 JSON 格式
  formatters: {
    level: (label) => {
      return { level: label }
    },
  },

  // 默认字段
  base: {
    env: process.env.NODE_ENV,
  },

  // 时间戳
  timestamp: pino.stdTimeFunctions.isoTime,
})

export default logger
```

### 步骤 4.2: 创建日志级别枚举

**文件**: `src/lib/logger/constants.ts`

```typescript
export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

export const LogMessages = {
  // API 请求
  API_REQUEST_START: "API 请求开始",
  API_REQUEST_SUCCESS: "API 请求成功",
  API_REQUEST_ERROR: "API 请求失败",

  // 数据库
  DB_QUERY_START: "数据库查询开始",
  DB_QUERY_SUCCESS: "数据库查询成功",
  DB_QUERY_ERROR: "数据库查询失败",

  // 认证
  AUTH_LOGIN_SUCCESS: "用户登录成功",
  AUTH_LOGIN_FAILED: "用户登录失败",
  AUTH_LOGOUT: "用户登出",

  // 业务逻辑
  PRACTICE_SAVE_SUCCESS: "练习进度保存成功",
  PRACTICE_SAVE_ERROR: "练习进度保存失败",
}
```

### 步骤 4.3: 创建结构化日志类型

**文件**: `src/lib/logger/types.ts`

```typescript
export interface ApiLogContext {
  method: string
  path: string
  statusCode?: number
  userId?: string
  duration?: number
  userAgent?: string
}

export interface DbLogContext {
  table?: string
  operation?: string
  query?: string
  userId?: string
  duration?: number
}

export interface ErrorLogContext {
  error: Error
  userId?: string
  path?: string
  additionalInfo?: Record<string, any>
}
```

---

## 🔍 Phase 5: API 监控中间件

### 步骤 5.1: 创建 API 监控中间件

**文件**: `src/middleware.ts`

```typescript
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import logger from "./lib/logger"

export function middleware(request: NextRequest) {
  const startTime = Date.now()

  // 记录请求开始
  logger.info({
    type: "API_REQUEST_START",
    method: request.method,
    path: request.nextUrl.pathname,
    userAgent: request.headers.get("user-agent"),
    ip: request.headers.get("x-forwarded-for") || "unknown",
  })

  // 添加响应头
  const response = NextResponse.next()

  // 记录响应
  response.headers.set("x-request-id", crypto.randomUUID())

  response.headers.set("x-response-time", `${Date.now() - startTime}ms`)

  return response
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
```

### 步骤 5.2: 创建 API 路由处理器包装器

**文件**: `src/lib/api-handler.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import logger from "./logger"

type ApiHandler = (
  request: NextRequest,
  context: { params: Promise<any> }
) => Promise<NextResponse>

export function withApiLogging(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context) => {
    const startTime = Date.now()
    const path = request.nextUrl.pathname

    try {
      // 执行处理器
      const response = await handler(request, context)

      // 记录成功
      const duration = Date.now() - startTime
      logger.info({
        type: "API_REQUEST_SUCCESS",
        method: request.method,
        path,
        status: response.status,
        duration,
      })

      return response
    } catch (error) {
      // 记录错误
      const duration = Date.now() - startTime
      logger.error({
        type: "API_REQUEST_ERROR",
        method: request.method,
        path,
        error: error instanceof Error ? error.message : String(error),
        duration,
        stack: error instanceof Error ? error.stack : undefined,
      })

      // 返回错误响应
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      )
    }
  }
}
```

### 步骤 5.3: 使用示例

**示例 API**: `src/app/api/practice/progress/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { withApiLogging } from "@/lib/api-handler"

async function handler(request: NextRequest) {
  // 您的 API 逻辑
  const data = await someOperation()

  return NextResponse.json(data)
}

export const GET = withApiLogging(handler)
export const POST = withApiLogging(handler)
```

---

## 🏥 Phase 6: 健康检查端点

### 步骤 6.1: 创建健康检查 API

**文件**: `src/app/api/health/route.ts`

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import logger from "@/lib/logger"

export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: "unknown" },
      memory: { status: "unknown" },
      disk: { status: "unknown" },
    },
  }

  try {
    // 1. 检查数据库连接
    const startTime = Date.now()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase.from("users").select("id").limit(1)
    const dbDuration = Date.now() - startTime

    health.checks.database = {
      status: error ? "error" : "ok",
      duration: `${dbDuration}ms`,
      error: error?.message,
    }

    // 2. 检查内存使用
    const memoryUsage = process.memoryUsage()
    const memoryUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2)
    const memoryTotalMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2)

    health.checks.memory = {
      status: "ok",
      used: `${memoryUsedMB}MB`,
      total: `${memoryTotalMB}MB`,
      usage: `${((Number(memoryUsedMB) / Number(memoryTotalMB)) * 100).toFixed(2)}%`,
    }

    // 3. 确定整体状态
    const hasErrors = Object.values(health.checks).some(
      (check) => check.status === "error"
    )
    health.status = hasErrors ? "error" : "ok"

    // 记录健康检查
    logger.info({
      type: "HEALTH_CHECK",
      status: health.status,
      checks: health.checks,
    })

    // 返回响应
    const statusCode = health.status === "ok" ? 200 : 503
    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    health.status = "error"
    health.checks.database = {
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    }

    logger.error({
      type: "HEALTH_CHECK_ERROR",
      error,
    })

    return NextResponse.json(health, { status: 503 })
  }
}
```

### 步骤 6.2: 测试健康检查

```bash
curl http://localhost:3000/api/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2026-01-21T12:00:00.000Z",
  "checks": {
    "database": {
      "status": "ok",
      "duration": "45ms"
    },
    "memory": {
      "status": "ok",
      "used": "123.45MB",
      "total": "256.00MB",
      "usage": "48.22%"
    }
  }
}
```

---

## 📊 Phase 7: 监控仪表板

### 步骤 7.1: 创建监控页面

**文件**: `src/app/admin/monitoring/page.tsx`

```typescript
"use client"

import { useEffect, useState } from "react"

interface HealthStatus {
  status: string
  timestamp: string
  checks: {
    database: { status: string; duration?: string }
    memory: { status: string; usage?: string }
  }
}

export default function MonitoringPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 每 30 秒检查一次健康状态
    const checkHealth = async () => {
      try {
        const response = await fetch("/api/health")
        const data = await response.json()
        setHealth(data)
      } catch (error) {
        console.error("健康检查失败:", error)
      } finally {
        setLoading(false)
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div>加载中...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">系统监控</h1>

      <div className="grid gap-4">
        {/* 整体状态 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">系统状态</h2>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                health?.status === "ok" ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span>{health?.status === "ok" ? "正常" : "异常"}</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            最后检查: {health?.timestamp}
          </p>
        </div>

        {/* 数据库状态 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">数据库</h2>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                health?.checks.database.status === "ok"
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />
            <span>{health?.checks.database.status === "ok" ? "正常" : "异常"}</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            响应时间: {health?.checks.database.duration}
          </p>
        </div>

        {/* 内存状态 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">内存使用</h2>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                health?.checks.memory.status === "ok"
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />
            <span>{health?.checks.memory.usage}</span>
          </div>
        </div>

        {/* Sentry 链接 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">错误追踪</h2>
          <a
            href="https://sentry.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            查看 Sentry 控制台 →
          </a>
        </div>
      </div>
    </div>
  )
}
```

### 步骤 7.2: 添加路由保护

确保只有管理员可以访问监控页面。

---

## 🧪 测试清单

### 测试前端错误捕获
- [ ] 访问 `/test-sentry-error`
- [ ] 检查 Sentry 控制台是否收到错误
- [ ] 检查错误堆栈是否完整

### 测试后端日志
- [ ] 触发一个 API 请求
- [ ] 检查服务器日志是否输出
- [ ] 验证日志格式是否为 JSON

### 测试健康检查
- [ ] 访问 `/api/health`
- [ ] 验证所有检查项正常
- [ ] 测试数据库断开时的响应

### 测试监控仪表板
- [ ] 访问 `/admin/monitoring`
- [ ] 验证所有状态显示正确
- [ ] 验证自动刷新功能

---

## 📈 扩展功能

### 1. 添加 Slack/Email 告警

```typescript
// 严重错误时发送告警
if (errorLevel === "critical") {
  await sendSlackAlert({
    text: `严重错误: ${error.message}`,
    channel: "#alerts",
  })
}
```

### 2. 添加日志持久化

```typescript
// 将日志保存到 Supabase
await supabase.from("logs").insert({
  level: "error",
  message: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
})
```

### 3. 添加性能监控图表

使用 Recharts 或 Chart.js 显示：
- API 响应时间趋势
- 错误率变化
- 用户活跃度

---

## 🎯 完成检查

部署前确认：
- [ ] Sentry DSN 已配置
- [ ] 环境变量已设置
- [ ] 所有测试通过
- [ ] 日志正常输出
- [ ] 健康检查工作正常
- [ ] 监控页面可访问

---

**文档版本**: v1.0
**最后更新**: 2026-01-21
