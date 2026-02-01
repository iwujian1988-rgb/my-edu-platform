# 生产环境日志策略

> **Created**: 2025-01-31
> **Reason**: 用户指出生产环境需要日志定位问题

---

## 🎯 日志分级策略

### 生产环境（默认）
```typescript
✅ console.error - 记录所有错误
✅ console.warn  - 记录所有警告
❌ console.log   - 禁用（防止内存泄漏）
❌ console.info  - 禁用
❌ console.debug - 禁用
```

### 开发环境
```typescript
✅ console.error - 记录错误
✅ console.warn  - 记录警告
❌ console.log   - 默认禁用
❌ console.info  - 禁用
❌ console.debug - 禁用
```

### 调试模式（DEBUG=true）
```typescript
✅ 所有日志都启用
```

---

## 📊 错误监控方案

### 1. Sentry（已配置）
```typescript
// 自动捕获所有未处理的错误
NEXT_PUBLIC_SENTRY_DSN="https://..."
NEXT_PUBLIC_SENTRY_ENVIRONMENT="development"
```

### 2. 手动上报关键错误
```typescript
import * as Sentry from '@sentry/nextjs'

try {
  // 关键业务逻辑
} catch (error) {
  Sentry.captureException(error)
  console.error('业务逻辑错误:', error)
}
```

### 3. 关键指标监控
```typescript
// 需要监控的关键点：
- API 失败率
- 数据库连接失败
- 认证失败
- 支付失败
- 学习计划生成失败
```

---

## 🚨 紧急情况处理

### 场景1：生产环境出问题，需要详细日志

**临时启用日志**（不需要重启）：
```bash
# 在部署平台设置环境变量
ENABLE_LOGS=true

# 或者在代码中动态启用（提供管理员接口）
POST /api/admin/enable-logs
{
  "duration": 300  // 启用5分钟
}
```

### 场景2：排查特定用户的bug

```typescript
// 基于用户ID启用日志
if (userId === 'problematic-user-id') {
  console.log('详细调试信息:', data)
}
```

### 场景3：特定功能调试

```typescript
// 基于功能开关启用日志
if (featureFlags.enableLearningPlanDebug) {
  console.log('学习计划生成详情:', {...})
}
```

---

## 📈 日志分析工具

### 开发环境
```bash
# 本地查看日志
npm run dev 2>&1 | tee logs/dev.log

# 过滤错误
npm run dev 2>&1 | grep "error"
```

### 生产环境
```bash
# Vercel 部署日志
vercel logs [deployment-url]

# Sentry 错误追踪
https://sentry.io/organizations/xxx/issues/
```

---

## 🔧 配置文件

### .env.local（开发）
```bash
ENABLE_LOGS=false  # 默认禁用
DEBUG=false        # 需要调试时开启
```

### .env.production（生产）
```bash
ENABLE_LOGS=false  # 必须禁用
DEBUG=false
```

### 动态启用（紧急情况）
```typescript
// /api/admin/enable-logs
export async function POST(request: Request) {
  const { duration } = await request.json()

  // 设置临时环境变量
  process.env.ENABLE_LOGS = 'true'

  // 定时恢复
  setTimeout(() => {
    process.env.ENABLE_LOGS = 'false'
  }, duration * 1000)

  return Response.json({ success: true })
}
```

---

## ✅ 检查清单

每次上线前：
- [ ] 确认 Sentry 正常工作
- [ ] 确认所有关键错误都有 console.error
- [ ] 确认所有警告都有 console.warn
- [ ] 确认没有 console.log 泄漏到生产
- [ ] 测试紧急日志启用机制

---

## 📝 技术债务

- [ ] 添加结构化日志（JSON格式）
- [ ] 添加请求ID追踪（链路追踪）
- [ ] 添加性能监控（APM）
- [ ] 添加日志聚合平台（ELK/Loki）
- [ ] 添加告警机制（Slack/钉钉）
