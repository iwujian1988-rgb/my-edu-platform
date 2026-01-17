/**
 * 超时工具函数
 * 用于防止API请求和数据库查询无限期挂起
 */

/**
 * 为Promise添加超时控制
 * @param promise 要执行的Promise
 * @param timeoutMs 超时时间（毫秒）
 * @param errorMessage 超时错误消息
 * @returns Promise或超时错误
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  // 创建超时Promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${errorMessage} (timeout: ${timeoutMs}ms)`))
    }, timeoutMs)
  })

  // 使用Promise.race，谁先完成就用谁的结果
  return Promise.race([promise, timeoutPromise])
}

/**
 * 为Promise.all添加超时控制
 * @param promises Promise数组
 * @param timeoutMs 超时时间（毫秒）
 * @param errorMessage 超时错误消息
 * @returns 所有Promise的结果或超时错误
 */
export async function withTimeoutAll<T>(
  promises: Promise<T>[],
  timeoutMs: number,
  errorMessage: string = 'Batch operation timed out'
): Promise<T[]> {
  return withTimeout(Promise.all(promises), timeoutMs, errorMessage)
}

/**
 * 创建带超时的AbortController
 * 用于可取消的fetch请求
 * @param timeoutMs 超时时间（毫秒）
 * @returns AbortController
 */
export function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller
}

/**
 * 安全的JSON解析，带超时和大小限制
 * @param request Next.js Request对象
 * @param options 配置选项
 * @returns 解析后的JSON对象
 */
export async function safeJsonParse<T = any>(
  request: Request,
  options: {
    timeout?: number // 超时时间（毫秒），默认5000
    maxSize?: number // 最大请求体大小（字节），默认1MB
  } = {}
): Promise<T> {
  const { timeout = 5000, maxSize = 1024 * 1024 } = options

  // 检查Content-Length
  const contentLength = request.headers.get('content-length')
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (size > maxSize) {
      throw new Error(`Request body too large: ${size} bytes (max: ${maxSize})`)
    }
  }

  // 使用超时控制
  return withTimeout(
    request.json(),
    timeout,
    'JSON parse timeout'
  )
}

/**
 * 数据库查询包装器，带超时和重试
 * @param queryFn 数据库查询函数
 * @param options 配置选项
 * @returns 查询结果
 */
export async function safeDbQuery<T>(
  queryFn: () => Promise<T>,
  options: {
    timeout?: number // 超时时间（毫秒），默认10000
    retries?: number // 重试次数，默认0
    retryDelay?: number // 重试延迟（毫秒），默认100
  } = {}
): Promise<T> {
  const { timeout = 10000, retries = 0, retryDelay = 100 } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(queryFn(), timeout, `Database query timeout (attempt ${attempt + 1})`)
    } catch (error) {
      lastError = error as Error

      // 如果是超时错误且还有重试次数
      if (attempt < retries && lastError.message.includes('timeout')) {
        console.log(`⚠️ Query timeout, retrying... (${attempt + 1}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        continue
      }

      throw lastError
    }
  }

  throw lastError
}

/**
 * 延迟执行
 * @param ms 延迟时间（毫秒）
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 带超时的循环执行
 * 防止循环无限执行
 * @param fn 循环体函数，返回false时停止循环
 * @param options 配置选项
 */
export async function safeLoop(
  fn: () => Promise<boolean>,
  options: {
    maxIterations?: number // 最大迭代次数，默认100
    timeout?: number // 总超时时间（毫秒），默认30000
    iterationDelay?: number // 每次迭代间隔（毫秒），默认0
  } = {}
): Promise<void> {
  const { maxIterations = 100, timeout = 30000, iterationDelay = 0 } = options

  const startTime = Date.now()
  let iterations = 0

  while (iterations < maxIterations) {
    // 检查总超时
    if (Date.now() - startTime > timeout) {
      throw new Error(`Loop timeout after ${iterations} iterations (timeout: ${timeout}ms)`)
    }

    const shouldContinue = await fn()
    if (!shouldContinue) {
      break
    }

    iterations++

    // 迭代间隔
    if (iterationDelay > 0) {
      await delay(iterationDelay)
    }
  }

  if (iterations >= maxIterations) {
    console.warn(`⚠️ Loop reached max iterations (${maxIterations})`)
  }
}
