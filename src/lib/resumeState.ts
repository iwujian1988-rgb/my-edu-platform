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

/**
 * 保存用户学习状态（客户端版本）
 * @param bookId - 词书ID
 * @param mode - 学习模式
 * @param context - 模式特定的上下文数据
 */
export async function saveResumeState(
  bookId: string,
  mode: ResumeMode,
  context: ResumeState['context']
) {
  try {
    const state: ResumeState = {
      mode,
      bookId,
      updatedAt: Date.now(),
      context
    }

    console.log('💾 Saving resume state:', { bookId, mode, context })

    const response = await fetch('/api/user-preferences', {
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
    } else {
      console.log('✅ Resume state saved successfully')
    }
  } catch (error) {
    console.error('❌ Exception in saveResumeState:', error)
  }
}
