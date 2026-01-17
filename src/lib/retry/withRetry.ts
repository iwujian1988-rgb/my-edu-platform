// lib/retry/withRetry.ts
// 对应方案：Section 6.4 - 带重试的异步函数包装器

import retry from 'async-retry'

interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  context?: string
}

/**
 * 带重试的异步函数包装器
 * 对应方案：Section 6.4 - 重试机制（3次重试，指数退避）
 *
 * @param fn - 要执行的异步函数
 * @param options - 重试配置
 * @returns 函数执行结果
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  // 对应方案：防御性编程 - 参数校验
  if (!fn || typeof fn !== 'function') {
    throw new Error('fn必须是一个函数')
  }

  const { maxAttempts, baseDelay, context } = options

  // 对应方案：防御性编程 - 配置校验
  if (!maxAttempts || maxAttempts < 1) {
    throw new Error('maxAttempts必须>=1')
  }

  if (!baseDelay || baseDelay < 0) {
    throw new Error('baseDelay必须>=0')
  }

  return retry(
    async (bail: (err: Error) => void) => {
      try {
        return await fn()
      } catch (error) {
        // 对应方案：Section 6.4 - 如果是AbortError，不重试
        if (error instanceof Error && error.name === 'AbortError') {
          bail(error)
          throw error  // TypeScript需要
        }

        throw error
      }
    },
    {
      // 对应方案：Section 6.4 - 指数退避配置
      retries: maxAttempts - 1,
      factor: 2,  // 指数退避
      minTimeout: baseDelay,
      maxTimeout: baseDelay * 4,
      onRetry: (error, attempt) => {
        // 对应方案：Section 6.4 - 重试日志
        console.warn(
          `⚠️ [${context || 'withRetry'}] 第${attempt}次重试...`,
          error.message
        )
      }
    }
  )
}
