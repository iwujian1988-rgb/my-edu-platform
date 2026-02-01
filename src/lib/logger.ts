/**
 * 统一日志管理
 *
 * 问题：大量 console.log 导致内存泄漏
 * 解决：通过环境变量统一控制日志开关
 *
 * 使用方法：
 * - 开发时需要调试：设置 DEBUG=true
 * - 生产环境：DEBUG=false（默认）
 * - 临时禁用：直接设置 ENABLE_LOGS=false
 */

const ENABLE_LOGS = process.env.ENABLE_LOGS === 'true'
const DEBUG = process.env.DEBUG === 'true'

// 是否启用日志
const isLoggingEnabled = ENABLE_LOGS || DEBUG

/**
 * 统一的日志函数
 * 如果未启用日志，所有输出都会被忽略
 */
export const logger = {
  log: (...args: any[]) => {
    if (isLoggingEnabled) {
      console.log(...args)
    }
  },

  warn: (...args: any[]) => {
    if (isLoggingEnabled) {
      console.warn(...args)
    }
    // 警告总是记录，因为可能表示问题
  },

  error: (...args: any[]) => {
    // 错误总是记录
    console.error(...args)
  },

  info: (...args: any[]) => {
    if (isLoggingEnabled) {
      console.info(...args)
    }
  },

  debug: (...args: any[]) => {
    if (DEBUG) {
      console.log('[DEBUG]', ...args)
    }
  }
}

/**
 * 快捷导出
 */
export const log = logger.log
export const warn = logger.warn
export const error = logger.error
export const info = logger.info
export const debug = logger.debug
