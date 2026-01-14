/**
 * 学习模式类型
 */
export type ResumeMode = 'word-list' | 'flashcards' | 'dictation' | 'match-game'

/**
 * 学习状态接口
 */
export interface ResumeState {
  mode: ResumeMode
  bookId: string
  bookTitle?: string
  updatedAt: number
  context?: {
    // word-list 模式
    filters?: {
      theme?: string
      scenario?: string
      status?: string
      chapter?: string
    }
    page?: number

    // flashcards 模式
    scope?: string

    // flashcards/dictation 模式
    index?: number
    totalWords?: number

    // match-game 模式
    sessionId?: string
    wordIds?: string[]
  }
}

// 常量定义
const API_BASE = '/api/user-preferences'

/**
 * 保存用户学习状态
 * @param bookId - 词书ID
 * @param mode - 学习模式
 * @param context - 模式特定的上下文数据
 * @returns 是否保存成功
 */
export async function saveResumeState(
  bookId: string,
  mode: ResumeMode,
  context: ResumeState['context']
): Promise<boolean> {
  try {
    const state: ResumeState = {
      mode,
      bookId,
      updatedAt: Date.now(),
      context
    }

    console.log('💾 Saving resume state:', { bookId, mode, context })

    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book_id: bookId,
        last_resume_state: state
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to save resume state:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText
      })
      return false
    }

    console.log('✅ Resume state saved successfully')
    return true
  } catch (error) {
    console.error('❌ Exception in saveResumeState:', error)
    return false
  }
}

/**
 * 获取用户的学习状态
 * @param bookId - 词书ID
 * @param mode - 学习模式
 * @returns 保存的状态，如果没有则返回null
 */
export async function getResumeState(
  bookId: string,
  mode: ResumeMode
): Promise<ResumeState | null> {
  try {
    console.log('📖 Fetching resume state:', { bookId, mode })

    // 修复：使用 URLSearchParams 防止注入
    const params = new URLSearchParams({ book_id: bookId })
    const response = await fetch(`${API_BASE}?${params.toString()}`)

    if (!response.ok) {
      console.error('❌ Failed to fetch resume state:', {
        status: response.status,
        statusText: response.statusText
      })
      return null
    }

    const data = await response.json()

    // 修复：API返回的结构是 { success: true, data: { last_resume_state: ... } }
    if (!data.data || !data.data.last_resume_state) {
      console.log('ℹ️ No resume state found')
      return null
    }

    const state = data.data.last_resume_state as ResumeState

    // 检查状态是否匹配（同一本书，同一模式）
    if (state.bookId !== bookId || state.mode !== mode) {
      console.log('ℹ️ Resume state does not match:', {
        expected: { bookId, mode },
        actual: { bookId: state.bookId, mode: state.mode }
      })
      return null
    }

    console.log('✅ Resume state found:', state)
    return state
  } catch (error) {
    console.error('❌ Exception in getResumeState:', error)
    return null
  }
}

/**
 * 检查恢复状态是否应该显示对话框
 * @param state - 恢复的状态
 * @returns 是否应该显示对话框
 */
export function shouldShowResumeDialog(state: ResumeState | null): boolean {
  // 早返回：没有状态
  if (!state) {
    return false
  }

  // 早返回：没有 context
  if (!state.context) {
    return false
  }

  const page = state.context.page
  const hoursSince = Date.now() - state.updatedAt

  // 检查条件
  const RESUME_STATE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24小时
  const isRecent = hoursSince < RESUME_STATE_EXPIRY_MS
  const isValidPage = page != null && page > 1

  return isRecent && isValidPage
}
