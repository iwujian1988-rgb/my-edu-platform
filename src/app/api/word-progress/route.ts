import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/word-progress?book_id=xxx
 * 获取指定词书的单词状态
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get('book_id')

    if (!bookId) {
      return NextResponse.json({ error: 'book_id is required' }, { status: 400 })
    }

    // 查询单词状态
    const { data: wordProgress, error: progressError } = await supabase
      .from('word_progress')
      .select('word_id, status, practice_count, correct_count, last_practiced_at')
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    if (progressError) {
      console.error('Error fetching word progress:', progressError)
      return NextResponse.json({ error: 'Failed to fetch word progress' }, { status: 500 })
    }

    // 转换为 Map 格式方便前端使用
    const progressMap: Record<string, any> = {}
    wordProgress?.forEach(item => {
      progressMap[item.word_id] = item
    })

    return NextResponse.json({
      success: true,
      data: progressMap
    })

  } catch (error) {
    console.error('Error in GET /api/word-progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/word-progress
 * 保存或更新单词状态
 */
export async function POST(request: NextRequest) {
  try {
    // 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 解析请求体
    const body = await request.json()
    const { word_id, book_id, status } = body

    // 验证必需参数
    if (!word_id || !book_id || !status) {
      return NextResponse.json(
        { error: 'word_id, book_id, and status are required' },
        { status: 400 }
      )
    }

    // 验证状态值
    const validStatuses = ['new', 'known', 'vague', 'unknown']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // 使用 UPSERT 保存或更新单词状态
    const { data: progressData, error: upsertError } = await supabase
      .from('word_progress')
      .upsert(
        {
          user_id: user.id,
          word_id,
          book_id,
          status,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,word_id,book_id',
          ignoreDuplicates: false
        }
      )
      .select()

    if (upsertError) {
      console.error('Error saving word progress:', upsertError)
      return NextResponse.json({ error: 'Failed to save word progress' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: progressData?.[0] || null
    })

  } catch (error) {
    console.error('Error in POST /api/word-progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/word-progress
 * 批量更新单词状态（用于批量标记）
 */
export async function PUT(request: NextRequest) {
  try {
    // 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 解析请求体
    const body = await request.json()
    const { updates } = body // 格式: [{ word_id, book_id, status }, ...]

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'updates must be a non-empty array' },
        { status: 400 }
      )
    }

    // 批量准备数据
    const records = updates.map(update => ({
      user_id: user.id,
      word_id: update.word_id,
      book_id: update.book_id,
      status: update.status,
      updated_at: new Date().toISOString()
    }))

    // 批量插入/更新
    const { data: progressData, error: upsertError } = await supabase
      .from('word_progress')
      .upsert(records, {
        onConflict: 'user_id,word_id,book_id',
        ignoreDuplicates: false
      })
      .select()

    if (upsertError) {
      console.error('Error batch updating word progress:', upsertError)
      return NextResponse.json({ error: 'Failed to batch update word progress' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: progressData,
      count: progressData?.length || 0
    })

  } catch (error) {
    console.error('Error in PUT /api/word-progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
