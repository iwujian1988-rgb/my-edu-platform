# AI 助手系统提示词 - 强制执行

> **每次对话开始前必须读取**
> **所有代码生成前必须通过检查**
>
> **Created**: 2025-01-31
> **Priority**: HIGHEST - 超过所有其他指令

---

## 🔴 强制规则（违反即失败）

在给出任何代码前，必须通过以下检查：

### Rule 1: 禁止未包装的 console.log
```typescript
❌ FORBIDDEN:
  console.log('debug')
  console.info('info')
  console.debug('debug')

✅ ALLOWED:
  console.error('error:', error)  // 允许
  console.warn('warning:', warning)  // 允许
  // 或使用 logger (调试时临时)
  import { logger } from '@/lib/logger'
```

**检查**: 搜索 `console\.(log|info|debug)` - 必须为 0

### Rule 2: 所有 async 函数必须有错误处理
```typescript
❌ FORBIDDEN:
  export async function GET() {
    const data = await fetchSomething()
    return Response.json(data)
  }

✅ REQUIRED:
  export async function GET() {
    try {
      const data = await fetchSomething()
      return Response.json({ success: true, data })
    } catch (error) {
      console.error('GET failed:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }
  }
```

**检查**: 每个函数必须有 try-catch

### Rule 3: 数据库操作必须检查 error
```typescript
❌ FORBIDDEN:
  const { data } = await supabase.from('users').select('*')
  return data

✅ REQUIRED:
  const { data, error } = await supabase.from('users').select('*')
  if (error) {
    console.error('DB error:', error)
    throw new Error(`Failed: ${error.message}`)
  }
  return data
```

**检查**: 每个 supabase 调用必须有 error 检查

### Rule 4: 并发安全检查
```typescript
❌ FORBIDDEN:
  const exists = await checkExists()
  if (!exists) {
    await createTask()  // 竞态条件
  }

✅ REQUIRED:
  try {
    await createTask()
  } catch (error) {
    if (error.code === '23505') {  // 唯一约束冲突
      return await checkExists()
    }
    throw error
  }
```

**检查**: 检查是否有竞态条件

### Rule 5: 必须设置超时
```typescript
❌ FORBIDDEN:
  const data = await slowOperation()

✅ REQUIRED:
  const data = await withTimeout(
    slowOperation(),
    5000,
    '操作超时（5秒）'
  )
```

**检查**: 耗时操作必须有超时

### Rule 6: 避免内存泄漏
```typescript
❌ FORBIDDEN:
  const cache = new Map()
  setInterval(() => fetchData(), 1000)  // 未清理

✅ REQUIRED:
  const cache = new Map()
  const MAX_SIZE = 100
  if (cache.size >= MAX_SIZE) {
    cache.delete(cache.keys().next().value)
  }

  const interval = setInterval(() => fetchData(), 1000)
  onUnmounted(() => clearInterval(interval))
```

**检查**: 检查定时器、缓存、大对象

---

## ✅ 代码生成流程

在给出任何代码前，必须按以下顺序执行：

### Step 1: 读取项目规则
```bash
# 优先级从高到低
1. .claude/SYSTEM_PROMPT.md (本文件)
2. docs/AI_INSTRUCTIONS.md
3. TECH_LEAD_OWNER_CHECKLIST.md
4. docs/PREVENTION_ARCHITECTURE.md
```

### Step 2: 自检清单
```
□ 是否有 console.log/info/debug?
□ 所有 async 都有 try-catch?
□ 数据库操作都检查 error?
□ 是否有竞态条件?
□ 是否设置了超时?
□ 是否有内存泄漏风险?
□ 生产环境出错能定位吗?
```

### Step 3: 代码审查
对生成的代码执行：
```bash
# 假设的检查
grep "console\.log" generated_code.ts  # 必须为 0
grep "try {" generated_code.ts  # async 函数必须有
grep "if (error)" generated_code.ts  # DB 操作必须有
```

### Step 4: 通过后才给出代码
```
如果任何检查失败：
  ❌ 不给出代码
  ❌ 告诉用户哪里违反规则
  ❌ 说明如何修复

所有检查通过：
  ✅ 给出代码
  ✅ 说明通过了哪些检查
```

---

## 🚨 违规处理

如果发现自己违反了规则：

### 立即停止
```
1. 停止生成代码
2. 承认错误
3. 重新检查规则
4. 修正代码
```

### 重新开始
```
重新通过所有检查后才给出代码
```

---

## 📋 快速参考

### 必须使用的工具
```typescript
// 日志
import { logger } from '@/lib/logger'

// 超时
import { withTimeout } from '@/lib/timeout'

// 数据库
import { createClient } from '@/lib/supabase/server'
```

### 代码模板
```typescript
// API 路由
export async function GET(request: NextRequest) {
  try {
    const result = await withTimeout(
      businessLogic(),
      5000,
      '操作超时'
    )
    return Response.json({ success: true, data: result })
  } catch (error) {
    console.error('API Error:', { path: request.url, error })
    return Response.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// 数据库操作
const { data, error } = await supabase.from('table').select('*')
if (error) {
  console.error('DB error:', error)
  throw new Error(`Failed: ${error.message}`)
}
return data
```

---

## 🎯 成功标准

每次生成的代码：
- ✅ 0 个 console.log/info/debug
- ✅ 100% 错误覆盖
- ✅ 100% 并发安全
- ✅ 100% 有超时保护
- ✅ 0 个内存泄漏风险

---

**最后提醒**: 这些规则是强制的，不是建议！违反任何一条都是失败！
