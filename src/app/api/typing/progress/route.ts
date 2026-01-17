import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/typing/progress?bookId=xxx&scope=xxx
 * 获取用户在指定词库+范围的打字进度
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get('bookId')
    const scope = searchParams.get('scope')

    if (!bookId || !scope) {
      return NextResponse.json(
        { error: 'Missing required parameters: bookId, scope' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 从 user_book_preferences 获取 last_resume_state
    const { data: prefData, error: prefError } = await supabase
      .from('user_book_preferences')
      .select('last_resume_state')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .single()

    if (prefError && prefError.code !== 'PGRST116') {
      // PGRST116 = not found, which is ok for new books
      console.error('[TypingProgress] Error fetching preferences:', prefError)
    }

    // 检查 last_resume_state 是否匹配当前配置
    const resumeState = prefData?.last_resume_state
    let savedIndex = null

    if (resumeState && typeof resumeState === 'object') {
      const mode = resumeState.mode || ''
      const context = resumeState.context || {}
      const savedScope = context.scope || context.scopeType || ''

      // 只有当模式是typing且scope匹配时才恢复
      if (mode === 'typing' && savedScope === scope) {
        savedIndex = context.index || context.currentIndex || null
      }
    }

    return NextResponse.json({
      success: true,
      bookId,
      scope,
      savedIndex,
      hasProgress: savedIndex !== null && savedIndex > 0
    })
  } catch (error) {
    console.error('[TypingProgress] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
