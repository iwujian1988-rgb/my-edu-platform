import { createClient, getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/words/stats?bookId=xxx
 * 获取单词书各状态的统计数据（仅返回统计数字，不返回单词内容）
 *
 * 使用直接SQL COUNT查询，性能极高
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get('bookId')

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. 快速检查词库权限
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, is_official, created_by, total_words')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      console.error('❌ Book not found:', { bookId, bookError })
      return NextResponse.json({ error: 'Book not found or access denied' }, { status: 404 })
    }

    // 自定义词库：检查是否为创建者
    if (book.is_official === false && book.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only access stats from your own custom books' },
        { status: 403 }
      )
    }

    // 2. 使用 Admin Client 执行高效的 COUNT 查询（绕过 RLS，提升性能）
    const adminClient = await createAdminClient()

    // 并行查询所有状态的单词数量（使用 COUNT，不返回单词数据）
    const [unknownResult, fuzzyResult, knownResult] = await Promise.all([
      // 各状态的单词数量
      adminClient
        .from('word_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('status', 'unknown'),

      adminClient
        .from('word_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('status', 'fuzzy'),

      adminClient
        .from('word_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('status', 'known')
    ])

    const markedCount = (unknownResult.count || 0) + (fuzzyResult.count || 0) + (knownResult.count || 0)
    const totalWords = book.total_words || 0
    const newCount = Math.max(0, totalWords - markedCount)

    const stats = {
      total: totalWords,
      unknown: unknownResult.count || 0,
      fuzzy: fuzzyResult.count || 0,
      known: knownResult.count || 0,
      new: newCount,
      all: totalWords
    }

    console.log('📊 Word stats:', stats)

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error in GET /api/words/stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
