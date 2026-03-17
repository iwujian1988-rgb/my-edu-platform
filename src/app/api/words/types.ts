/**
 * 单词 API 类型定义
 *
 * @description 完整的类型定义，禁止使用 any
 * @see docs/AI_CODING_GUARDRAILS.md
 */

import { WORD_STATUS, ERROR_CODES } from './constants'

/**
 * 单词状态类型
 */
export type WordStatus = typeof WORD_STATUS[keyof typeof WORD_STATUS]

/**
 * 范围类型（用于筛选）
 */
export type ScopeType = 'all' | 'unknown' | 'fuzzy' | 'known' | 'new'

/**
 * 单词实体（完整）
 */
export interface Word {
  id: string
  word: string
  phonetic: string | null
  uk_phonetic: string | null
  us_phonetic: string | null
  definition: string
  definition_en: string | null
  example_sentence: string | null
  example_sentence_en: string | null
  collocation: string | null
  collocation_en: string | null
  part_of_speech: string | null
  chapter_id: string
  audio_url: string | null
  order_index: number

  // 附加字段
  theme?: string | null
  scene?: string | null
  status?: WordStatus
}

/**
 * 获取单词列表请求参数
 */
export interface GetWordsParams {
  /** 词书 ID（必填） */
  bookId: string

  /** 筛选范围（默认 'all'） */
  status: ScopeType

  /** 是否乱序（默认 false） */
  shuffle: boolean

  /** 页码（从 1 开始） */
  page: number

  /** 每页数量 */
  pageSize: number

  /** 章节筛选（可选，'all' 表示不筛选） */
  chapterId?: string
}

/**
 * 获取单词列表响应
 */
export interface GetWordsResponse {
  success: boolean
  data: Word[]
  page: number
  pageSize: number

  /**
   * 匹配当前筛选条件的单词总数
   * 用于前端计算总页数和进度
   */
  count: number

  /**
   * 整本书的单词总数
   */
  total: number

  /** 书名 */
  bookTitle?: string

  /** 是否有主题数据 */
  hasThemeData?: boolean

  /** 是否有场景数据 */
  hasSceneData?: boolean
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  success: false
  error: string
  code: typeof ERROR_CODES[keyof typeof ERROR_CODES]
  details?: Record<string, unknown>
}

/**
 * 内部使用的 ID 列表结果
 */
export interface WordIdListResult {
  ids: string[]
  count: number
}

/**
 * 章节信息
 */
export interface ChapterInfo {
  id: string
  theme_id: string | null
  scene_id: string | null
}

/**
 * 用户进度信息
 */
export interface UserProgress {
  word_id: string
  status: WordStatus
}
