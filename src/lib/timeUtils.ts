/**
 * 时间格式化工具
 * 用于将时间戳转换为友好的相对时间描述
 */

/**
 * 时间单位定义（毫秒）
 */
const TIME_UNITS = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000
} as const

/**
 * 格式化时间差为友好的相对时间描述
 *
 * @param timestamp - 时间戳（毫秒）
 * @returns 相对时间描述（如"刚刚"、"2分钟前"、"3天前"等）
 *
 * @example
 * formatTimeAgo(Date.now() - 30 * 1000) // '刚刚'
 * formatTimeAgo(Date.now() - 5 * 60 * 1000) // '5分钟前'
 * formatTimeAgo(Date.now() - 3 * 60 * 60 * 1000) // '3小时前'
 * formatTimeAgo(Date.now() - 2 * 24 * 60 * 60 * 1000) // '2天前'
 * formatTimeAgo(Date.now() - 7 * 24 * 60 * 60 * 1000) // '1周前'
 */
export function formatTimeAgo(timestamp: number): string {
  // 参数校验
  if (!timestamp || typeof timestamp !== 'number') {
    console.warn('[formatTimeAgo] Invalid timestamp:', timestamp)
    return '未知时间'
  }

  const now = Date.now()
  const diff = now - timestamp

  // 时间在未来（可能时区问题）
  if (diff < 0) {
    console.warn('[formatTimeAgo] Timestamp is in the future:', timestamp)
    return '刚刚'
  }

  // 小于1分钟：刚刚
  if (diff < TIME_UNITS.minute) {
    return '刚刚'
  }

  // 小于1小时：X分钟前
  if (diff < TIME_UNITS.hour) {
    const minutes = Math.floor(diff / TIME_UNITS.minute)
    return `${minutes}分钟前`
  }

  // 小于1天：X小时前
  if (diff < TIME_UNITS.day) {
    const hours = Math.floor(diff / TIME_UNITS.hour)
    return `${hours}小时前`
  }

  // 小于1周：X天前
  if (diff < TIME_UNITS.week) {
    const days = Math.floor(diff / TIME_UNITS.day)
    return `${days}天前`
  }

  // 小于1个月：X周前
  if (diff < TIME_UNITS.month) {
    const weeks = Math.floor(diff / TIME_UNITS.week)
    return `${weeks}周前`
  }

  // 小于1年：X个月前
  if (diff < TIME_UNITS.year) {
    const months = Math.floor(diff / TIME_UNITS.month)
    return `${months}月前`
  }

  // 超过1年：X年前
  const years = Math.floor(diff / TIME_UNITS.year)
  return `${years}年前`
}

/**
 * 格式化时间差为详细的时间描述（带日期）
 *
 * @param timestamp - 时间戳（毫秒）
 * @returns 详细时间描述（如"2024-01-10 15:30"）
 *
 * @example
 * formatDateTime(Date.now() - 3 * 24 * 60 * 60 * 1000)
 * // 返回: '2024-01-07 15:30' (假设现在是2024-01-10)
 */
export function formatDateTime(timestamp: number): string {
  if (!timestamp || typeof timestamp !== 'number') {
    console.warn('[formatDateTime] Invalid timestamp:', timestamp)
    return '未知时间'
  }

  const date = new Date(timestamp)

  // 格式化为 YYYY-MM-DD HH:mm
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}
