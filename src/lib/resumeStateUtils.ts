/**
 * 学习状态恢复工具函数
 * 提供数据验证、边界检查、防御性编程
 */

// ============ 常量定义 ============
export const RESUME_STATE_CONFIG = {
  MAX_HOURS: 24, // 恢复状态有效期（小时）
  MIN_PAGE: 1, // 最小页码
  MAX_PAGE: 10000, // 最大页码（防止API滥用）
  MAX_FILTER_LENGTH: 100, // 筛选条件最大长度
} as const

// ============ 类型定义 ============
export interface ValidatedResumeState {
  mode: string
  bookId: string
  updatedAt: number
  context?: {
    filters?: {
      theme?: string
      scenario?: string
      status?: string
      chapter?: string
    }
    page?: number
  }
}

// ============ 验证函数 ============

/**
 * 验证并清洗页码
 * @param page - 原始页码（可能是字符串、数字、null、undefined）
 * @returns 验证后的页码，如果无效则返回 null
 */
export function validatePageNumber(page: any): number | null {
  // 1. 类型检查
  if (page === null || page === undefined) {
    return null
  }

  // 2. 转换为数字
  const numPage = typeof page === 'string' ? parseInt(page, 10) : page

  // 3. 检查是否为有效数字
  if (typeof numPage !== 'number' || isNaN(numPage)) {
    console.warn('⚠️ [Validation] Invalid page number:', page)
    return null
  }

  // 4. 边界检查
  if (numPage < RESUME_STATE_CONFIG.MIN_PAGE || numPage > RESUME_STATE_CONFIG.MAX_PAGE) {
    console.warn('⚠️ [Validation] Page out of range:', numPage)
    return null
  }

  // 5. 检查是否为整数
  if (!Number.isInteger(numPage)) {
    console.warn('⚠️ [Validation] Page must be integer:', numPage)
    return null
  }

  return numPage
}

/**
 * 验证并清洗筛选条件
 * @param value - 筛选值
 * @param fieldName - 字段名（用于日志）
 * @returns 验证后的值，如果无效则返回 undefined
 */
export function validateFilterValue(value: any, fieldName: string): string | undefined {
  // 1. 空值检查
  if (value === null || value === undefined) {
    return undefined
  }

  // 2. 类型检查
  if (typeof value !== 'string') {
    console.warn(`⚠️ [Validation] ${fieldName} must be string:`, typeof value)
    return undefined
  }

  // 3. 长度检查
  if (value.length > RESUME_STATE_CONFIG.MAX_FILTER_LENGTH) {
    console.warn(`⚠️ [Validation] ${fieldName} too long:`, value.length)
    return undefined
  }

  // 4. 格式检查（防止XSS）
  // 只允许字母、数字、中文字符、常见符号
  const safePattern = /^[\w\s\u4e00-\u9fa5\-_]+$/
  if (!safePattern.test(value)) {
    console.warn(`⚠️ [Validation] ${fieldName} contains invalid characters:`, value)
    return undefined
  }

  return value
}

/**
 * 验证时间戳
 * @param timestamp - 时间戳
 * @returns 是否有效（不能是未来时间，不能是负数，不能太旧）
 */
export function validateTimestamp(timestamp: any): boolean {
  // 1. 类型检查
  if (typeof timestamp !== 'number' || isNaN(timestamp)) {
    console.warn('⚠️ [Validation] Invalid timestamp:', timestamp)
    return false
  }

  // 2. 负数检查
  if (timestamp < 0) {
    console.warn('⚠️ [Validation] Timestamp is negative:', timestamp)
    return false
  }

  const now = Date.now()

  // 3. 未来时间检查（允许5分钟的时钟偏差）
  const fiveMinutes = 5 * 60 * 1000
  if (timestamp > now + fiveMinutes) {
    console.warn('⚠️ [Validation] Timestamp is in the future:', timestamp, now)
    return false
  }

  // 4. 太旧检查（超过1年视为无效）
  const oneYear = 365 * 24 * 60 * 60 * 1000
  if (timestamp < now - oneYear) {
    console.warn('⚠️ [Validation] Timestamp is too old:', timestamp)
    return false
  }

  return true
}

/**
 * 计算时间差（小时）
 * @param timestamp - 时间戳
 * @returns 距离现在的小时数，如果无效则返回 Infinity
 */
export function calculateHoursSince(timestamp: number): number {
  if (!validateTimestamp(timestamp)) {
    return Infinity // 无效时间戳，返回无穷大（不显示对话框）
  }

  const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60)

  // 防止负数（时钟偏差）
  return Math.max(0, hoursSince)
}

/**
 * 验证恢复状态数据完整性
 * @param state - 原始状态
 * @param expectedBookId - 期望的书籍ID
 * @returns 验证后的状态，如果无效则返回 null
 */
export function validateResumeState(
  state: any,
  expectedBookId: string
): ValidatedResumeState | null {
  // 1. 基础结构检查
  if (!state || typeof state !== 'object') {
    console.warn('⚠️ [Validation] State is not an object')
    return null
  }

  // 2. bookId 检查
  if (!state.bookId || state.bookId !== expectedBookId) {
    console.warn('⚠️ [Validation] BookId mismatch:', {
      expected: expectedBookId,
      actual: state.bookId
    })
    return null
  }

  // 3. mode 检查
  if (!state.mode || typeof state.mode !== 'string') {
    console.warn('⚠️ [Validation] Invalid mode:', state.mode)
    return null
  }

  // 4. updatedAt 检查
  if (!state.updatedAt || !validateTimestamp(state.updatedAt)) {
    console.warn('⚠️ [Validation] Invalid updatedAt:', state.updatedAt)
    return null
  }

  // 5. context 检查（可选）
  if (state.context) {
    if (typeof state.context !== 'object') {
      console.warn('⚠️ [Validation] Context must be object')
      return null
    }

    // 验证 page
    if (state.context.page !== undefined) {
      const validPage = validatePageNumber(state.context.page)
      if (validPage === null) {
        console.warn('⚠️ [Validation] Invalid page in context')
        return null
      }
      // 替换为验证后的值
      state.context.page = validPage
    }

    // 验证 filters
    if (state.context.filters) {
      if (typeof state.context.filters !== 'object') {
        console.warn('⚠️ [Validation] Filters must be object')
        return null
      }

      // 清洗每个筛选条件
      const { filters } = state.context
      const cleanedFilters: any = {}

      if (filters.theme) {
        const validated = validateFilterValue(filters.theme, 'theme')
        if (validated) cleanedFilters.theme = validated
      }
      if (filters.scenario) {
        const validated = validateFilterValue(filters.scenario, 'scenario')
        if (validated) cleanedFilters.scenario = validated
      }
      if (filters.status) {
        const validated = validateFilterValue(filters.status, 'status')
        if (validated) cleanedFilters.status = validated
      }
      if (filters.chapter) {
        const validated = validateFilterValue(filters.chapter, 'chapter')
        if (validated) cleanedFilters.chapter = validated
      }

      state.context.filters = cleanedFilters
    }
  }

  return state as ValidatedResumeState
}

/**
 * 检查是否应该显示恢复对话框
 * @param state - 验证后的状态
 * @returns 是否应该显示
 */
export function shouldShowResumeDialog(state: ValidatedResumeState | null): boolean {
  // 1. 状态存在性检查
  if (!state || !state.context) {
    return false
  }

  // 2. 页码检查
  const page = state.context.page
  if (!page || page <= 1) {
    return false
  }

  // 3. 时间检查
  const hoursSince = calculateHoursSince(state.updatedAt)
  if (hoursSince >= RESUME_STATE_CONFIG.MAX_HOURS) {
    return false
  }

  // 4. 所有条件满足
  return true
}

/**
 * 从 URL 参数构建安全的恢复状态
 * @param searchParams - URLSearchParams
 * @returns 恢复状态对象，如果无效则返回 null
 */
export function buildResumeStateFromURL(searchParams: URLSearchParams): {
  page?: number
  theme?: string
  scenario?: string
  status?: string
  chapter?: string
} | null {
  const result: any = {}

  // 1. 验证 page
  const pageParam = searchParams.get('page')
  if (pageParam) {
    const validPage = validatePageNumber(pageParam)
    if (validPage !== null) {
      result.page = validPage
    }
  }

  // 2. 验证 theme
  const themeParam = searchParams.get('theme')
  if (themeParam && themeParam !== 'all') {
    const validTheme = validateFilterValue(themeParam, 'theme')
    if (validTheme) {
      result.theme = validTheme
    }
  }

  // 3. 验证 scenario
  const scenarioParam = searchParams.get('scenario')
  if (scenarioParam && scenarioParam !== 'all') {
    const validScenario = validateFilterValue(scenarioParam, 'scenario')
    if (validScenario) {
      result.scenario = validScenario
    }
  }

  // 4. 验证 status
  const statusParam = searchParams.get('status')
  if (statusParam && statusParam !== 'all') {
    const validStatus = validateFilterValue(statusParam, 'status')
    if (validStatus) {
      result.status = validStatus
    }
  }

  // 5. 验证 chapter
  const chapterParam = searchParams.get('chapter')
  if (chapterParam && chapterParam !== 'all') {
    const validChapter = validateFilterValue(chapterParam, 'chapter')
    if (validChapter) {
      result.chapter = validChapter
    }
  }

  // 如果没有任何有效参数，返回 null
  if (Object.keys(result).length === 0) {
    return null
  }

  return result
}
