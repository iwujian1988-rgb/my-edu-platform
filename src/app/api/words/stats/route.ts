import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/words/stats?bookId=xxx
 * 快速获取单词书的统计数据（不返回实际单词数据）
 * 用于 FlashcardStatsBar 显示各状态的单词分布
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

    // 并行检查：权限 + 单词书信息 + 用户进度统计
    const [bookResult, progressResult] = await Promise.all([
      // 检查词库权限并获取总单词数
      supabase
        .from('books')
        .select('id, is_official, created_by, total_words')
        .eq('id', bookId)
        .single(),
      // 获取所有用户进度数据
      supabase
        .from('word_progress')
        .select('word_id, status')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
    ])

    // 权限检查
    const { data: book, error: bookError } = bookResult
    if (bookError || !book) {
      console.error('❌ Book not found:', { bookId, bookError })
      return NextResponse.json({ error: 'Book not found or access denied' }, { status: 404 })
    }

    const bookData = book as any

    // 自定义词库：检查是否为创建者
    if (bookData.is_official === false && bookData.created_by) {
      if (bookData.created_by !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: You can only access words from your own custom books' },
          { status: 403 }
        )
      }
    }

    // 统计各状态的单词数量
    const totalWords = bookData.total_words || 0
    const stats = {
      total: totalWords,
      all: totalWords,
      unknown: 0,
      fuzzy: 0,
      known: 0,
      new: totalWords // 默认都是未标注
    }

    if (progressResult.data && progressResult.data.length > 0) {
      const progressSet = new Set(progressResult.data.map((p: any) => p.word_id))
      stats.new = totalWords - progressSet.size // 减去有进度的单词数

      // 统计各状态的数量
      progressResult.data.forEach((p: any) => {
        if (p.status === 'unknown') stats.unknown++
        else if (p.status === 'fuzzy') stats.fuzzy++
        else if (p.status === 'known') stats.known++
      })
    }

    console.log(`📊 Stats for book ${bookId}:`, stats)

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error in GET /api/words/stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
