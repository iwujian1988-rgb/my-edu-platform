/**
 * 前端错误追踪工具
 * 用于生产环境收集和上报错误
 */

interface ErrorLog {
  type: 'javascript' | 'network' | 'hydration' | 'performance'
  message: string
  stack?: string
  url: string
  userAgent: string
  userId?: string
  timestamp: number
  environment: string
  // 自定义字段
  extra?: Record<string, any>
}

class ErrorTracker {
  private enabled: boolean = false
  private apiUrl: string = '/api/logs'
  private userId: string | null = null
  private batchSize: number = 10
  private errorQueue: ErrorLog[] = []
  private flushTimer: NodeJS.Timeout | null = null

  /**
   * 初始化错误追踪器
   */
  init(options: { userId?: string; enabled?: boolean; apiUrl?: string } = {}) {
    // 只在生产环境启用
    this.enabled = options.enabled !== undefined ? options.enabled : process.env.NODE_ENV === 'production'
    this.userId = options.userId || null
    this.apiUrl = options.apiUrl || '/api/logs'

    if (!this.enabled) return

    console.log('[ErrorTracker] 已启用')

    // 1. 全局 JavaScript 错误
    window.addEventListener('error', (event) => {
      this.log({
        type: 'javascript',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        environment: process.env.NODE_ENV || 'unknown',
      })
    })

    // 2. 未捕获的 Promise Rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.log({
        type: 'javascript',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        environment: process.env.NODE_ENV || 'unknown',
      })
    })

    // 3. Hydration 错误（React 18+）
    if (typeof window !== 'undefined' && (window as any).React) {
      const originalError = console.error
      console.error = (...args) => {
        const message = args.join(' ')
        if (message.includes('Hydration failed')) {
          this.log({
            type: 'hydration',
            message: message,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            environment: process.env.NODE_ENV || 'unknown',
          })
        }
        originalError.apply(console, args)
      }
    }

    // 4. 网络请求错误（通过 fetch 拦截）
    this.interceptFetch()

    // 5. 定时批量上报
    this.flushTimer = setInterval(() => {
      this.flush()
    }, 30000) // 每30秒上报一次
  }

  /**
   * 拦截 fetch 请求，捕获网络错误
   */
  private interceptFetch() {
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)

        // 捕获 HTTP 错误状态码
        if (!response.ok) {
          this.log({
            type: 'network',
            message: `HTTP ${response.status}: ${args[0]}`,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            environment: process.env.NODE_ENV || 'unknown',
            extra: {
              status: response.status,
              requestUrl: args[0],
            },
          })
        }

        return response
      } catch (error) {
        this.log({
          type: 'network',
          message: `Network Error: ${args[0]}`,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          environment: process.env.NODE_ENV || 'unknown',
          stack: (error as Error)?.stack,
        })
        throw error
      }
    }
  }

  /**
   * 记录错误日志
   */
  log(errorLog: ErrorLog) {
    if (!this.enabled) return

    // 添加用户ID
    if (this.userId) {
      errorLog.userId = this.userId
    }

    // 开发环境打印到控制台
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ErrorTracker]', errorLog)
    }

    // 添加到队列
    this.errorQueue.push(errorLog)

    // 达到批次大小立即上报
    if (this.errorQueue.length >= this.batchSize) {
      this.flush()
    }
  }

  /**
   * 手动记录自定义错误
   */
  logError(message: string, extra?: Record<string, any>) {
    this.log({
      type: 'javascript',
      message,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'unknown',
      extra,
    })
  }

  /**
   * 手动记录性能问题
   */
  logPerformance(metricName: string, value: number, extra?: Record<string, any>) {
    this.log({
      type: 'performance',
      message: `Performance: ${metricName} = ${value}ms`,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'unknown',
      extra: { metricName, value, ...extra },
    })
  }

  /**
   * 上报错误到服务器
   */
  private async flush() {
    if (this.errorQueue.length === 0) return

    const logsToSend = [...this.errorQueue]
    this.errorQueue = []

    try {
      await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend }),
      })

      console.log(`[ErrorTracker] 已上报 ${logsToSend.length} 条日志`)
    } catch (error) {
      console.error('[ErrorTracker] 上报失败:', error)
      // 上报失败，重新放回队列
      this.errorQueue.unshift(...logsToSend)
    }
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string) {
    this.userId = userId
  }

  /**
   * 销毁追踪器
   */
  destroy() {
    this.enabled = false
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush() // 最后上报一次
  }
}

// 导出单例
export const errorTracker = new ErrorTracker()

// 便捷函数
export function logError(message: string, extra?: Record<string, any>) {
  errorTracker.logError(message, extra)
}

export function logPerformance(metricName: string, value: number, extra?: Record<string, any>) {
  errorTracker.logPerformance(metricName, value, extra)
}
