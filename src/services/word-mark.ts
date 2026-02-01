/**
 * 统一单词标记服务
 *
 * 职责：封装与 /api/v3/word-mark API 的交互
 * 遵循 SOLID 原则 - 单一职责
 *
 * 文档：tech-design-learning-plan.md
 * @version 1.0.0
 */

import type { WordStatus } from '@/types/progress'

/**
 * 标记单词的请求参数
 */
export interface MarkWordRequest {
  wordId: string
  bookId: string
  status: WordStatus // 'known' | 'fuzzy' | 'unknown'
  source?: string    // 'flashcard' | 'dictation' | 'word-list' | 'match-game' | 'typing'
}

/**
 * 标记单词的响应数据
 */
export interface MarkWordResponse {
  success: boolean
  data?: {
    wordMarked: boolean
    reviewScheduleUpdated: boolean
    taskUpdated: boolean
    allCompleted: boolean
  }
  error?: string
}

/**
 * 统一标记函数（核心入口）
 *
 * 根据 prdeveryday.md 第 2.2 节的要求：
 * - 所有学习模式统一调用此函数
 * - 自动创建/更新复习计划
 * - 自动更新今日任务完成度
 *
 * @param params 标记参数
 * @returns 标记结果
 */
export async function markWord(params: MarkWordRequest): Promise<MarkWordResponse> {
  const { wordId, bookId, status, source } = params

  // 参数校验（防御性编程）
  if (!wordId || typeof wordId !== 'string') {
    return {
      success: false,
      error: 'Invalid wordId: must be a non-empty string'
    }
  }

  if (!bookId || typeof bookId !== 'string') {
    return {
      success: false,
      error: 'Invalid bookId: must be a non-empty string'
    }
  }

  const validStatuses: WordStatus[] = ['known', 'fuzzy', 'unknown']
  if (!status || !validStatuses.includes(status)) {
    return {
      success: false,
      error: `Invalid status: must be one of ${validStatuses.join(', ')}`
    }
  }

  try {
    // 调用统一标记 API
    const response = await fetch('/api/v3/word-mark', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        wordId,
        bookId,
        status,
        source: source || 'unknown'
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return data as MarkWordResponse

  } catch (error: any) {
    console.error('markWord failed:', error)
    return {
      success: false,
      error: error.message || 'Network error'
    }
  }
}

/**
 * 批量标记单词
 *
 * 用于某些场景（如单词列表）需要一次性标记多个单词
 *
 * @param marks 批量标记参数数组
 * @returns 批量标记结果
 */
export async function markWordsBatch(
  marks: MarkWordRequest[]
): Promise<{ success: boolean; results: MarkWordResponse[]; errors: string[] }> {
  // 并发标记所有单词（性能优化）
  const results = await Promise.all(
    marks.map(mark => markWord(mark))
  )

  // 分离成功和失败的结果
  const errors = results
    .filter((r, index) => !r.success)
    .map((r, index) => `Word ${marks[index].wordId}: ${r.error}`)

  return {
    success: errors.length === 0,
    results,
    errors
  }
}
