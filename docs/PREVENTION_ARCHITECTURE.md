# 防御性编码 - 从根源避免问题

> **核心理念**: 通过架构、工具、流程，让问题**无法产生**，而不是事后修复
>
> **Created**: 2025-01-31
> **Target**: 让AI（和人类）开发者无法写出有问题的代码

---

## 🎯 三层防御体系

```
┌─────────────────────────────────────────┐
│  Layer 1: 编译时禁止（让错误代码无法运行） │
├─────────────────────────────────────────┤
│  Layer 2: 自动化检测（让问题在CI就暴露）  │
├─────────────────────────────────────────┤
│  Layer 3: 运行时保护（让问题无法造成影响） │
└─────────────────────────────────────────┘
```

---

## Layer 1: 编译时禁止

### 1.1 ESLint 规则 - 禁止未包装的 console.log

**问题**: 598个 console.log 导致内存泄漏
**解决**: 强制使用统一的日志系统

```json
// .eslintrc.json
{
  "rules": {
    "no-console": ["error", {
      "allow": ["warn", "error"]
    }],
    // 自定义规则：禁止直接使用 console.log
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.object.name='console'][callee.property.name=/log|info|debug/]",
        "message": "使用 logger.log() 代替 console.log()，防止生产环境内存泄漏"
      }
    ]
  }
}
```

**效果**:
```typescript
❌ console.log('debug')  // ESLint 报错，无法提交
✅ logger.log('debug')   // 正确方式
✅ console.error('error') // 允许
```

### 1.2 TypeScript 严格模式 - 类型安全

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,  // 防止undefined访问
    "noImplicitReturns": true,         // 防止忘记返回
    "noUnusedLocals": true,            // 防止未使用变量（内存泄漏）
    "noUnusedParameters": true          // 防止未使用参数
  }
}
```

### 1.3 Import 顺序强制 - 必须先引入日志控制

```typescript
// ✅ 正确的顺序
import '@/lib/disable-logs'  // 必须第一行
import { NextRequest } from 'next/server'

// ❌ 错误的顺序
import { NextRequest } from 'next/server'
import '@/lib/disable-logs'  // ESLint 报错
```

ESLint 规则：
```json
{
  "rules": {
    "import/order": ["error", {
      "groups": [
        ["builtin", "external"],
        {
          "name": "@/lib/disable-logs",
          "order": 1
        },
        ["internal", "parent", "sibling"]
      ]
    }]
  }
}
```

---

## Layer 2: 自动化检测

### 2.1 CI 自动检查 - 每次 PR 都运行

```yaml
# .github/workflows/pr-check.yml
name: PR Quality Check

on:
  pull_request:
    branches: [master, main]

jobs:
  quality-gate:
    runs-on: ubuntu-latest

    steps:
      # 检查1: ESLint
      - name: Lint Check
        run: |
          npm run lint
          # 如果有 console.log，CI 失败

      # 检查2: TypeScript 编译
      - name: Type Check
        run: npm run type-check

      # 检查3: console.log 数量监控
      - name: Log Count Check
        run: |
          LOG_COUNT=$(grep -r "console\.log" src/ | wc -l)
          echo "当前 console.log 数量: $LOG_COUNT"

          if [ $LOG_COUNT -gt 50 ]; then
            echo "❌ console.log 过多（当前: $LOG_COUNT，上限: 50）"
            exit 1
          fi

      # 检查4: 内存泄漏检测
      - name: Memory Leak Scan
        run: |
          npm run test:memory  # 运行内存测试

      # 棢查5: 性能基准
      - name: Performance Benchmark
        run: |
          npm run benchmark
          # 确保没有性能退化
```

### 2.2 Git Hooks - 提交前检查

```bash
# .husky/pre-commit
#!/bin/sh

# 检查是否有新增的 console.log
ADDED_LOGS=$(git diff --cached --name-only | xargs grep "console\.log" || true)

if [ -n "$ADDED_LOGS" ]; then
  echo "❌ 检测到新增的 console.log："
  echo "$ADDED_LOGS"
  echo "请使用 logger.log() 代替"
  exit 1
fi

# 检查是否有大对象未清理
ADDED_LARGE_ARRAYS=$(git diff --cached | grep -c "new Array(1000" || true)

if [ $ADDED_LARGE_ARRAYS -gt 0 ]; then
  echo "⚠️ 警告：检测到大数组，请确认是否有内存泄漏风险"
fi

# 运行 lint
npm run lint

# 运行类型检查
npm run type-check
```

### 2.3 自动化内存检测

```typescript
// tests/memory-leak.test.ts
import { memoryLeakDetector } from '@/lib/memory-leak-detector'

describe('内存泄漏检测', () => {
  it('API 路由不应该有内存泄漏', async () => {
    // 模拟1000次请求
    const initialMemory = process.memoryUsage().heapUsed

    for (let i = 0; i < 1000; i++) {
      await fetch('/api/v3/daily-task?bookId=xxx')
    }

    // 等待垃圾回收
    await global.gc()

    const finalMemory = process.memoryUsage().heapUsed
    const memoryGrowth = finalMemory - initialMemory

    // 允许增长10MB，超过则失败
    expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024)
  })
})
```

---

## Layer 3: 运行时保护

### 3.1 全局日志控制器（已实现）

```typescript
// src/lib/disable-logs.ts
// ✓ 自动禁用 console.log/info/debug
// ✓ 保留 console.error/warn
// ✓ 生产环境自动生效
```

### 3.2 请求超时保护

```typescript
// src/lib/timeout.ts
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  errorMessage: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeout)
  })

  return Promise.race([promise, timeoutPromise])
}

// 使用示例
export async function GET(request: NextRequest) {
  return withTimeout(
    fetchData(),
    5000,
    'API 请求超时（5秒）'
  )
}
```

### 3.3 内存监控中间件

```typescript
// src/lib/memory-monitor.ts
export function memoryMonitor(req: NextRequest, res: NextResponse) {
  const before = process.memoryUsage()

  res.on('finish', () => {
    const after = process.memoryUsage()
    const delta = after.heapUsed - before.heapUsed

    // 单个请求内存增长超过10MB，告警
    if (delta > 10 * 1024 * 1024) {
      console.error('⚠️ 高内存告警:', {
        path: req.nextUrl.pathname,
        memoryDelta: `${(delta / 1024 / 1024).toFixed(2)} MB`
      })
    }
  })
}
```

### 3.4 连接池限制

```typescript
// next.config.js
module.exports = {
  experimental: {
    // 限制并发连接数
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // 强制关闭空闲连接
    serverMinify: true,
  }
}
```

---

## 🏗️ 架构设计 - 从根源避免

### 原则1: 单一职责

```typescript
// ❌ 错误：一个函数做太多事
async function generateTask() {
  await checkAuth()      // 认证
  await validateInput()  // 验证
  await fetchData()      // 查询
  await processData()    // 处理
  await saveData()       // 保存
  await sendNotification() // 通知
  // 哪里出错了？无法定位！
}

// ✅ 正确：拆分成小函数，每个可测试
async function generateTask() {
  const user = await checkAuth()
  const input = await validateInput()
  const data = await fetchData(input)
  const processed = await processData(data)
  const saved = await saveData(processed)
  await sendNotification(saved)
  // 每一步都可以单独测试和监控
}
```

### 原则2: 依赖注入

```typescript
// ✅ 所有外部依赖都作为参数注入
export async function generateTodayTask(
  userId: string,
  bookId: string,
  dependencies: {
    db: Database          // 可替换为 mock
    logger: Logger        // 可替换为测试logger
    cache: Cache          // 可替换为内存cache
    config: Config        // 可配置超时等
  }
) {
  dependencies.logger.log('Generating task...')
  // 所有依赖都可以在测试中替换
}
```

### 原则3: 失败快速

```typescript
// ❌ 错误：静默失败
async function getUser(id: string) {
  try {
    return await db.query('SELECT * FROM users WHERE id = $1', [id])
  } catch (error) {
    return null  // 静默失败，无法定位问题
  }
}

// ✅ 正确：失败时明确报错
async function getUser(id: string) {
  try {
    return await db.query('SELECT * FROM users WHERE id = $1', [id])
  } catch (error) {
    console.error('getUser failed:', { id, error })
    throw new Error(`Failed to fetch user ${id}: ${error.message}`)
  }
}
```

---

## 📋 开发流程 - Code Review 检查清单

### 每次 PR 必须回答的问题

```markdown
## 代码质量自查

- [ ] **内存安全**
  - [ ] 是否有未清理的定时器？
  - [ ] 是否有未释放的连接？
  - [ ] 是否有闭包引用大对象？

- [ ] **错误处理**
  - [ ] 所有 async 函数都有 try-catch？
  - [ ] 数据库错误会正确传播？
  - [ ] 用户输入都有验证？

- [ ] **性能考虑**
  - [ ] 是否有不必要的循环查询？
  - [ ] 是否有可以合并的请求？
  - [ ] 是否添加了缓存？

- [ ] **可观测性**
  - [ ] 错误会记录到 Sentry？
  - [ ] 关键操作有日志？
  - [ ] 日志级别正确（error/warn）？

- [ ] **并发安全**
  - [ ] 有竞态条件吗？
  - [ ] 需要事务吗？
  - [ ] 幂等性保证？

## 测试覆盖

- [ ] 单元测试覆盖率 > 80%
- [ ] 关键路径有集成测试
- [ ] 边界情况已测试
```

---

## 🤖 AI 编码助手配置

### 对 Claude/GPT 的系统提示

创建 `docs/AI_INSTRUCTIONS.md`：

```markdown
# AI 编码助手指令

你是一名资深工程师，在编码时必须遵守：

## 强制规则

1. **禁止直接使用 console.log**
   - 使用 `import { logger } from '@/lib/logger'`
   - 只在开发调试时使用，提交前删除

2. **必须处理错误**
   - 所有 async 函数必须有 try-catch
   - 所有数据库操作必须检查 error
   - 错误必须包含上下文信息

3. **必须考虑并发**
   - 检查是否有竞态条件
   - 需要时使用事务
   - 考虑幂等性

4. **必须考虑内存**
   - 避免大对象长期持有
   - 及时清理引用
   - 使用 weakMap/weakSet

## 代码模板

### API 路由模板
```typescript
export async function GET(request: NextRequest) {
  // 1. 参数验证
  const { error, data } = validateInput(request)
  if (error) return NextResponse.json({ error }, { status: 400 })

  // 2. 超时保护
  const result = await withTimeout(
    businessLogic(data),
    5000,
    '操作超时'
  )

  // 3. 错误处理
  try {
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('API Error:', { path: request.url, error })
    Sentry.captureException(error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

## 自检问题

在给出代码前，必须自问：
1. 这段代码会有内存泄漏吗？
2. 并发调用会出问题吗？
3. 生产环境出问题能定位吗？
4. 如果超时了怎么办？
5. 如果数据库挂了怎么办？
```

### 在 ClaudeCode 中配置

将上述内容放入项目根目录，并在每次对话开始时提醒：

```
用户: 帮我实现XXX功能
Claude: [自动读取 docs/AI_INSTRUCTIONS.md]
好的，我会按照以下标准实现：
✅ 使用 logger 而不是 console.log
✅ 完整的错误处理
✅ 超时保护
✅ 并发安全
...
```

---

## 📊 质量门禁

### 必须通过的指标

```yaml
quality_gate:
  # 单元测试
  test_coverage:
    minimum: 80
    blocking: true

  # console.log 数量
  console_log_count:
    maximum: 50
    blocking: true

  # TypeScript 错误
  type_errors:
    maximum: 0
    blocking: true

  # ESLint 错误
  lint_errors:
    maximum: 0
    blocking: true

  # 性能基准
  performance:
    api_response_time_p95:
      maximum: 500ms
      blocking: true

    memory_growth:
      maximum: 10MB
      blocking: true
```

---

## ✅ 立即行动清单

### 今天就做
- [x] 创建 ESLint 规则禁止 console.log
- [x] 添加 Git Hooks 检查
- [x] 创建 AI 编码指令文档

### 本周完成
- [ ] 配置 CI 质量门禁
- [ ] 添加内存泄漏测试
- [ ] 添加性能基准测试

### 持续改进
- [ ] 每周代码审查统计
- [ ] 每月质量指标回顾
- [ ] 季度架构优化

---

## 🎯 成功标准

6个月后：
- ✅ 零生产环境内存泄漏
- ✅ 零未捕获的错误（Sentry覆盖）
- ✅ 所有 PR 通过自动化检查
- ✅ 代码审查时间减少 50%
- ✅ 新人上手时间减少 70%

**关键指标**: 不是"修复了多少bug"，而是"阻止了多少bug"
