// src/types/dictation.ts
// 对应方案：Section 6.2 - 听写模式类型定义

/**
 * 范围类型定义
 * 对应方案：Section 6.2
 */
export type DictationScopeType = 'all' | 'unknown' | 'fuzzy' | 'known' | 'new'

/**
 * 范围标签映射
 * 对应方案：Section 6.2
 */
export const DICTATION_SCOPE_LABELS: Record<DictationScopeType, string> = {
  all: '全部单词',
  unknown: '不认识的',
  fuzzy: '模糊的',
  known: '认识',
  new: '未标注'
} as const

/**
 * 统计数据接口
 * 对应方案：Section 6.2
 */
export interface DictationStats {
  all: number
  unknown: number
  fuzzy: number
  known: number
  new: number
}

/**
 * 进度数据接口
 * 对应方案：Section 6.2
 */
export interface DictationProgress {
  currentIndex: number
  totalWords: number
  lastStudyTime: number
}

/**
 * API响应接口
 * 对应方案：Section 6.2
 */
export interface DictationStatsResponse {
  success: true
  data: DictationStats
  _cached?: boolean  // 对应方案：Section 6.2 - 标记是否来自缓存
}

export interface DictationProgressResponse {
  success: true
  data: DictationProgress | null
}

export interface DictationErrorResponse {
  success: false
  error: string
  code: 'INVALID_PARAMS' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'BOOK_NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL_ERROR'
  details?: Array<{  // 对应方案：Section 6.2 - 详细错误列表
    path: string[]
    message: string
    code: string
  }>
}
