import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/typing/recent
 * 获取用户最近的打字练习配置记录（最多5条）
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .rpc('get_typing_recent_practice', { p_user_id: user.id })

    if (error) {
      console.error('[TypingRecent] Error fetching recent practice:', error)
      return NextResponse.json({ error: 'Failed to fetch recent practice' }, { status: 500 })
    }

    return NextResponse.json({ records: data || [] })
  } catch (error) {
    console.error('[TypingRecent] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/typing/recent
 * 保存用户最近的打字练习配置
 * Body: { bookId: string, scope: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bookId, scope } = body

    if (!bookId || !scope) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, scope' },
        { status: 400 }
      )
    }

    // 验证scope值
    const validScopes = ['all', 'new', 'known', 'fuzzy', 'unknown', 'mistakes']
    if (!validScopes.includes(scope)) {
      return NextResponse.json(
        { error: `Invalid scope. Must be one of: ${validScopes.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .rpc('save_typing_recent_practice', {
        p_user_id: user.id,
        p_book_id: bookId,
        p_scope: scope
      })

    if (error) {
      console.error('[TypingRecent] Error saving recent practice:', error)
      return NextResponse.json({ error: 'Failed to save recent practice' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data })
  } catch (error) {
    console.error('[TypingRecent] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
