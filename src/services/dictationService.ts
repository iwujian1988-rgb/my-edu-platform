// src/services/dictationService.ts
// 对应方案：Section 6.3 - DictationService: 听写模式API封装

import { DictationScopeType, DictationStats, DictationProgress } from '@/types/dictation'

/**
 * 获取认证Token的辅助函数
 * 对应方案：防御性编程 - 集中管理Token获取
 */
function getAuthToken(): string {
  // 尝试从localStorage获取
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('supabase_token')
    if (token) return token
  }
  return ''
}

/**
 * DictationService: 听写模式API封装
 * 对应方案：Section 6.3 - 职责：封装API调用、错误处理、自动重试、并发控制
 */
class DictationService {
  // 对应方案：Section 6.3 - 配置常量
  private readonly MAX_RETRIES = 3
  private readonly BASE_DELAY = 1000  // 1秒
  private abortControllers = new Map<string, AbortController>()

  /**
   * 获取单词状态统计（带重试）
   * 对应方案：Section 6.3 - getStats方法
   */
  async getStats(bookId: string): Promise<DictationStats> {
    // 对应方案：防御性编程 - 参数校验
    if (!bookId) {
      throw new Error('bookId不能为空')
    }

    let attemptCount = 0

    while (attemptCount < this.MAX_RETRIES) {
      try {
        const response = await fetch(
          `/api/words/stats?bookId=${encodeURIComponent(bookId)}`,
          {
            headers: {
              'Content-Type': 'application/json',
              // 注意：在使用Supabase SSR时，认证通常通过cookie自动处理
            }
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: '未知错误' }))
          throw new Error(errorData.error || '获取统计数据失败')
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error('获取统计数据失败')
        }

        return data.data
      } catch (error) {
        attemptCount++

        // 对应方案：Section 6.3 - 如果是最后一次尝试，抛出错误
        if (attemptCount >= this.MAX_RETRIES) {
          throw error
        }

        // 对应方案：Section 6.3 - 指数退避
        const delay = this.BASE_DELAY * Math.pow(2, attemptCount - 1)
        console.warn(`⚠️ [getStats] 第${attemptCount}次重试... 延迟${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error('获取统计数据失败')
  }

  /**
   * 获取听写进度（带重试 + 并发控制）
   * 对应方案：Section 6.3 - getProgress方法
   */
  async getProgress(
    bookId: string,
    scopeType: DictationScopeType
  ): Promise<DictationProgress | null> {
    // 对应方案：防御性编程 - 参数校验
    if (!bookId || !scopeType) {
      throw new Error('bookId和scopeType不能为空')
    }

    const key = `progress:${bookId}:${scopeType}`
    let attemptCount = 0

    while (attemptCount < this.MAX_RETRIES) {
      try {
        // 对应方案：Section 6.3 - 取消之前的请求（并发控制）
        const prevController = this.abortControllers.get(key)
        if (prevController) {
          prevController.abort()
        }

        // 对应方案：Section 6.3 - 创建新的AbortController
        const controller = new AbortController()
        this.abortControllers.set(key, controller)

        try {
          const params = new URLSearchParams({
            bookId,
            scopeType,
            mode: 'dictation'  // 对应方案：Section 4.1.2 - 新增mode参数
          })

          const response = await fetch(
            `/api/flashcard-progress?${params.toString()}`,
            {
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          )

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: '未知错误' }))
            throw new Error(errorData.error || '获取进度失败')
          }

          const data = await response.json()
          return data.data
        } finally {
          this.abortControllers.delete(key)
        }
      } catch (error) {
        // 对应方案：Section 6.3 - 如果是AbortError，不重试
        if (error instanceof Error && error.name === 'AbortError') {
          throw error
        }

        attemptCount++

        // 对应方案：Section 6.3 - 如果是最后一次尝试，抛出错误
        if (attemptCount >= this.MAX_RETRIES) {
          throw error
        }

        // 对应方案：Section 6.3 - 指数退避
        const delay = this.BASE_DELAY * Math.pow(2, attemptCount - 1)
        console.warn(`⚠️ [getProgress] 第${attemptCount}次重试... 延迟${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error('获取进度失败')
  }

  /**
   * 保存听写进度（带重试）
   * 对应方案：Section 6.3 - saveProgress方法
   */
  async saveProgress(
    bookId: string,
    scopeType: DictationScopeType,
    currentIndex: number,
    totalWords: number
  ): Promise<void> {
    // 对应方案：防御性编程 - 参数校验
    if (!bookId || !scopeType) {
      throw new Error('bookId和scopeType不能为空')
    }

    if (currentIndex < 0 || totalWords < 0) {
      throw new Error('currentIndex和totalWords不能为负数')
    }

    let attemptCount = 0

    while (attemptCount < this.MAX_RETRIES) {
      try {
        const response = await fetch('/api/flashcard-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bookId,
            scopeType,
            mode: 'dictation',  // 对应方案：Section 4.1.2 - 新增mode参数
            currentIndex,
            totalWords
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: '未知错误' }))
          throw new Error(errorData.error || '保存进度失败')
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error('保存进度失败')
        }

        return
      } catch (error) {
        attemptCount++

        // 对应方案：Section 6.3 - 如果是最后一次尝试，抛出错误
        if (attemptCount >= this.MAX_RETRIES) {
          throw error
        }

        // 对应方案：Section 6.3 - 指数退避
        const delay = this.BASE_DELAY * Math.pow(2, attemptCount - 1)
        console.warn(`⚠️ [saveProgress] 第${attemptCount}次重试... 延迟${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  /**
   * 获取单词列表（带重试 + 并发控制）
   * 对应方案：Section 6.3 - getWords方法
   */
  async getWords(
    bookId: string,
    scopeType: DictationScopeType,
    shuffle: boolean = false
  ): Promise<any[]> {
    // 对应方案：防御性编程 - 参数校验
    if (!bookId || !scopeType) {
      throw new Error('bookId和scopeType不能为空')
    }

    const key = `words:${bookId}:${scopeType}`
    let attemptCount = 0

    while (attemptCount < this.MAX_RETRIES) {
      try {
        // 对应方案：Section 6.3 - 取消之前的请求（并发控制）
        const prevController = this.abortControllers.get(key)
        if (prevController) {
          prevController.abort()
        }

        // 对应方案：Section 6.3 - 创建新的AbortController
        const controller = new AbortController()
        this.abortControllers.set(key, controller)

        try {
          const params = new URLSearchParams({
            bookId,
            status: scopeType,
            shuffle: shuffle.toString(),
            page: '1',
            pageSize: '10000'  // 听写模式需要加载所有单词
          })

          const response = await fetch(
            `/api/words?${params.toString()}`,
            {
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          )

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: '未知错误' }))
            throw new Error(errorData.error || '获取单词列表失败')
          }

          const data = await response.json()

          if (!data.success) {
            throw new Error('获取单词列表失败')
          }

          return data.data || []
        } finally {
          this.abortControllers.delete(key)
        }
      } catch (error) {
        // 对应方案：Section 6.3 - 如果是AbortError，不重试
        if (error instanceof Error && error.name === 'AbortError') {
          throw error
        }

        attemptCount++

        // 对应方案：Section 6.3 - 如果是最后一次尝试，抛出错误
        if (attemptCount >= this.MAX_RETRIES) {
          throw error
        }

        // 对应方案：Section 6.3 - 指数退避
        const delay = this.BASE_DELAY * Math.pow(2, attemptCount - 1)
        console.warn(`⚠️ [getWords] 第${attemptCount}次重试... 延迟${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error('获取单词列表失败')
  }
}

// 导出单例
export const dictationService = new DictationService()
