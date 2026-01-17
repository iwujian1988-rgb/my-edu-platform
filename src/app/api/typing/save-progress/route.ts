import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/typing/save-progress
 * 保存用户的打字练习进度
 * Body: { bookId: string, scope: string, index: number, totalWords: number }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bookId, scope, index, totalWords } = body

    if (!bookId || !scope || index === undefined || !totalWords) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, scope, index, totalWords' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 构建 resume_state 对象
    const resumeState = {
      mode: 'typing',
      bookId,
      context: {
        scope,
        scopeType: scope,
        index,
        currentIndex: index,
        totalWords,
        total_words_in_scope: totalWords,
      },
      updatedAt: Date.now()
    }

    // 更新或插入 user_book_preferences
    const { data, error } = await supabase
      .from('user_book_preferences')
      .upsert(
        {
          user_id: user.id,
          book_id: bookId,
          last_resume_state: resumeState,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,book_id'
        }
      )
      .select()

    if (error) {
      console.error('[TypingProgress] Error saving progress:', error)
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[TypingProgress] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
