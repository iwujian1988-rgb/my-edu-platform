/**
 * 继续学习URL生成工具
 * 根据恢复状态生成对应学习模式的URL
 */

import { LearningMode, ScopeType } from '@/types/progress'

/**
 * 继续学习URL配置接口
 */
export interface ContinueURLConfig {
  /** 词书ID */
  bookId: string
  /** 学习模式 */
  mode: LearningMode
  /** 范围类型 */
  scopeType: ScopeType
  /** 当前单词索引（用于hash定位） */
  currentIndex: number
  /** 是否启用乱序（仅flashcards/dictation有效） */
  shuffle?: boolean
}

/**
 * 生成继续学习的完整URL
 *
 * @param config - URL配置对象
 * @returns 完整的URL路径（带查询参数和hash）
 *
 * @example
 * // 卡片背单词模式
 * generateContinueURL({
 *   bookId: 'book-123',
 *   mode: 'flashcards',
 *   scopeType: 'unknown',
 *   currentIndex: 10,
 *   shuffle: true
 * })
 * // 返回: '/study/book-123/flashcards?scope=unknown&shuffle=true&resume=true#word-10'
 *
 * @example
 * // 听写模式
 * generateContinueURL({
 *   bookId: 'book-456',
 *   mode: 'dictation',
 *   scopeType: 'fuzzy',
 *   currentIndex: 5
 * })
 * // 返回: '/study/book-456/dictation?scope=fuzzy&resume=true#word-5'
 *
 * @example
 * // 单词表模式
 * generateContinueURL({
 *   bookId: 'book-789',
 *   mode: 'word-list',
 *   scopeType: 'all',
 *   currentIndex: 0
 * })
 * // 返回: '/library/book-789'
 */
export function generateContinueURL(config: ContinueURLConfig): string {
  const { bookId, mode, scopeType, currentIndex, shuffle = true } = config

  // 参数校验
  if (!bookId || !mode) {
    console.error('[generateContinueURL] Invalid config: missing bookId or mode', config)
    return '/'
  }

  try {
    // 根据模式生成不同的URL
    switch (mode) {
      case 'flashcards':
        return generateFlashcardsURL(bookId, scopeType, currentIndex, shuffle)

      case 'dictation':
        return generateDictationURL(bookId, scopeType, currentIndex)

      case 'word-list':
        return generateWordListURL(bookId)

      case 'match-game':
        return generateMatchGameURL(bookId)

      case 'typing':
        return generateTypingURL(bookId, scopeType)

      default:
        console.warn(`[generateContinueURL] Unknown mode: ${mode}`)
        return '/'
    }
  } catch (error) {
    console.error('[generateContinueURL] Error generating URL:', error)
    return '/'
  }
}

/**
 * 生成卡片背单词URL
 * @example /study/book-123/flashcards?scope=unknown&shuffle=true&resume=true#word-10
 */
function generateFlashcardsURL(
  bookId: string,
  scopeType: ScopeType,
  currentIndex: number,
  shuffle: boolean
): string {
  const params = new URLSearchParams({
    scope: scopeType,
    shuffle: String(shuffle),
    resume: 'true'
  })

  return `/study/${bookId}/flashcards?${params.toString()}#word-${currentIndex}`
}

/**
 * 生成听写模式URL
 * @example /study/book-456/dictation?scope=fuzzy&resume=true#word-5
 */
function generateDictationURL(
  bookId: string,
  scopeType: ScopeType,
  currentIndex: number
): string {
  const params = new URLSearchParams({
    scope: scopeType,
    resume: 'true'
  })

  return `/study/${bookId}/dictation?${params.toString()}#word-${currentIndex}`
}

/**
 * 生成单词表URL
 * @example /library/book-789
 *
 * 注意：单词表模式不需要额外参数，因为恢复状态会通过resumeState.ts处理
 */
function generateWordListURL(bookId: string): string {
  return `/library/${bookId}`
}

/**
 * 生成消消乐URL
 * @example /study/book-abc/match-game
 *
 * 注意：消消乐暂不支持断点续做，因此不携带索引
 */
function generateMatchGameURL(bookId: string): string {
  return `/study/${bookId}/match-game`
}

/**
 * 生成打字练习URL
 * @example /typing/book-abc/practice?scope=unknown
 *
 * 注意：打字练习暂不支持断点续做，因此不携带索引
 */
function generateTypingURL(bookId: string, scopeType: ScopeType): string {
  const params = new URLSearchParams({
    scope: scopeType
  })

  return `/typing/${bookId}/practice?${params.toString()}`
}
