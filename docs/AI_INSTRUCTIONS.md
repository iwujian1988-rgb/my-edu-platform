# AI 编码助手 - 强制指令

> **给所有 AI 和人类开发者**: 必须遵守的编码标准
>
> **违反这些规则的代码将被拒绝**

---

## 🔒 铁律（不可违反）

### 1. 禁止未包装的 console.log

```typescript
// ❌ 绝对禁止
console.log('debug')
console.info('info')
console.debug('debug')

// ✅ 正确方式
import { logger } from '@/lib/logger'
logger.log('debug')

// ✅ 或者（仅在调试时）
// eslint-disable-next-line no-console
console.log('临时调试日志')

// ✅ 错误日志（允许）
console.error('error:', error)
console.warn('warning:', warning)
```

### 2. 所有 async 函数必须处理错误

```typescript
// ❌ 错误
export async function GET() {
  const data = await fetchSomething()
  return Response.json(data)
}

// ✅ 正确
export async function GET() {
  try {
    const data = await fetchSomething()
    return Response.json({ success: true, data })
  } catch (error) {
    console.error('GET failed:', error)
    return Response.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### 3. 数据库操作必须检查 error

```typescript
// ❌ 错误
const { data } = await supabase.from('users').select('*')
return data

// ✅ 正确
const { data, error } = await supabase.from('users').select('*')

if (error) {
  console.error('Database error:', error)
  throw new Error(`Failed to fetch users: ${error.message}`)
}

return data
```

### 4. 必须考虑并发安全

```typescript
// ❌ 错误：竞态条件
const task = await checkExists()
if (!task) {
  await createTask()  // 多个请求可能同时执行
}

// ✅ 正确：处理冲突
const task = await checkExists()
if (!task) {
  try {
    await createTask()
  } catch (error) {
    if (error.code === '23505') {  // 唯一性约束冲突
      const existing = await checkExists()
      return existing
    }
    throw error
  }
}
```

### 5. 必须设置超时

```typescript
// ❌ 错误：可能永久挂起
const data = await slowOperation()

// ✅ 正确：设置超时
const data = await withTimeout(
  slowOperation(),
  5000,
  '操作超时（5秒）'
)
```

### 6. 避免内存泄漏

```typescript
// ❌ 错误：未清理
setInterval(() => {
  fetchData()
}, 1000)

// ✅ 正确：保存引用，组件卸载时清理
const interval = setInterval(() => {
  fetchData()
}, 1000)

// 组件卸载时
onUnmounted(() => {
  clearInterval(interval)
})

// ❌ 错误：大对象长期持有
const cache = new Map()
function addToCache(key: any, largeData: any) {
  cache.set(key, largeData)  // 永不删除
}

// ✅ 正确：使用 WeakMap 或限制大小
const cache = new Map()
const MAX_CACHE_SIZE = 100

function addToCache(key: any, largeData: any) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
  cache.set(key, largeData)
}
```

---

## 📋 代码模板

### API 路由模板

```typescript
import { createClient } from '@/lib/supabase/server'
import { withTimeout } from '@/lib/timeout'

/**
 * GET /api/example
 * 描述：做什么
 */
export async function GET(request: NextRequest) {
  // 1. 参数验证
  const param = request.nextUrl.searchParams.get('param')
  if (!param) {
    return Response.json(
      { error: 'param is required' },
      { status: 400 }
    )
  }

  // 2. 业务逻辑（带超时）
  try {
    const result = await withTimeout(
      businessLogic(param),
      5000,
      '操作超时'
    )

    return Response.json({
      success: true,
      data: result
    })
  } catch (error) {
    // 3. 错误处理
    console.error('API Error:', {
      path: request.url,
      error: error.message
    })

    return Response.json(
      {
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack
        })
      },
      { status: 500 }
    )
  }
}
```

### 数据库操作模板

```typescript
async function getUser(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('getUser failed:', { userId, error })
    throw new Error(`Failed to fetch user: ${error.message}`)
  }

  if (!data) {
    throw new Error(`User not found: ${userId}`)
  }

  return data
}
```

---

## 🤖 自检清单

在给出代码前，必须自问：

### 内存安全
- [ ] 有未清理的定时器/interval？
- [ ] 有未释放的数据库连接？
- [ ] 有闭包引用大对象？
- [ ] 有全局变量累积？

### 错误处理
- [ ] 所有 async 函数都有 try-catch？
- [ ] 数据库错误会正确传播？
- [ ] 用户输入都有验证？

### 性能考虑
- [ ] 有不必要的循环查询？
- [ ] 有可以合并的请求？
- [ ] 是否需要缓存？

### 并发安全
- [ ] 有竞态条件？
- [ ] 需要事务吗？
- [ ] 幂等性保证？

### 可观测性
- [ ] 错误会记录到 console.error？
- [ ] 关键操作有日志？
- [ ] 日志级别正确？

---

## 🚨 红灯信号（立即停止）

如果代码有以下特征，立即重构：

1. **嵌套超过 3 层** - 拆分成函数
2. **函数超过 50 行** - 拆分成小函数
3. **参数超过 5 个** - 使用对象参数
4. **try-catch 覆盖整个函数** - 缩小范围
5. **多个 async/await 串行** - 考虑 Promise.all
6. **魔法数字** - 提取为常量
7. **重复代码** - 提取为函数

---

## 📚 参考资料

- 项目质量清单: `TECH_LEAD_OWNER_CHECKLIST.md`
- 防御性编码: `docs/PREVENTION_ARCHITECTURE.md`
- 生产日志策略: `docs/PRODUCTION_LOGGING_STRATEGY.md`

---

**记住**: 写代码前先阅读这些规则，违反规则的代码将被拒绝！
