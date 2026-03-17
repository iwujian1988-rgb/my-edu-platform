/**
 * 单词 API 常量定义
 *
 * @description 所有魔法数字必须提取为命名常量
 * @see docs/AI_CODING_GUARDRAILS.md
 */

/**
 * 分页配置
 */
export const PAGINATION = {
  /** 每页默认单词数量 */
  DEFAULT_PAGE_SIZE: 50,

  /** 每页最大单词数量 */
  MAX_PAGE_SIZE: 100,

  /** 每页最小单词数量 */
  MIN_PAGE_SIZE: 10,
} as const

// 为了兼容旧代码，导出单独的常量
export const DEFAULT_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE
export const MAX_PAGE_SIZE = PAGINATION.MAX_PAGE_SIZE
export const MIN_PAGE_SIZE = PAGINATION.MIN_PAGE_SIZE

/**
 * 乱序模式配置
 */
export const SHUFFLE = {
  /**
   * 乱序模式最大支持的单词数量
   * 超过此数量的词书在乱序模式下只能获取部分数据
   */
  MAX_WORDS: 10000,

  /**
   * 种子格式: 使用 bookId 和 status 生成固定种子
   * 保证同一用户、同一范围、乱序模式下每次加载顺序一致
   */
  SEED_FORMAT: (bookId: string, status: string) => `${bookId}-${status}`,
} as const

/**
 * 数据库查询配置
 */
export const DB_QUERY = {
  /** 单次查询超时时间（毫秒） */
  TIMEOUT_MS: 10000,

  /** 最大迭代次数（防止无限循环） */
  MAX_ITERATIONS: 200,

  /** 批量查询每批数量 */
  BATCH_SIZE: 500,
} as const

/**
 * 状态类型（与数据库 word_progress.status 对应）
 */
export const WORD_STATUS = {
  ALL: 'all',
  NEW: 'new',
  UNKNOWN: 'unknown',
  FUZZY: 'fuzzy',
  KNOWN: 'known',
} as const

export type WordStatusType = typeof WORD_STATUS[keyof typeof WORD_STATUS]

/**
 * API 响应错误码
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  BOOK_NOT_FOUND: 'BOOK_NOT_FOUND',
  INVALID_PARAMS: 'INVALID_PARAMS',
  WORDS_FETCH_ERROR: 'WORDS_FETCH_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  FORBIDDEN: 'FORBIDDEN',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]
