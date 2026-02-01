/**
 * 全局日志控制（防止内存泄漏）
 *
 * 策略：
 * - 开发环境：DEBUG=true 时显示所有日志
 * - 生产环境：只记录 error 和 warn，禁用 log/info/debug
 *
 * 使用方法：
 * - 开发时需要调试：在 .env.local 设置 DEBUG=true
 * - 查看生产日志：使用 Sentry（已配置）
 * - 临时开启日志：设置 ENABLE_LOGS=true
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const ENABLE_LOGS = process.env.ENABLE_LOGS === 'true'
const DEBUG = process.env.DEBUG === 'true'

if (!isDevelopment && !ENABLE_LOGS && !DEBUG) {
  // 生产环境：只保留 error 和 warn
  console.log = () => {}
  console.info = () => {}
  console.debug = () => {}
  // console.warn 保留（记录警告）
  // console.error 保留（记录错误）
} else if (isDevelopment && !DEBUG && !ENABLE_LOGS) {
  // 开发环境（默认）：禁用高频日志，保留错误日志
  console.log = () => {}
  console.info = () => {}
  console.debug = () => {}
  // console.warn 保留
  // console.error 保留
}

export {}
