import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/word-progress/batch-stats
 * 批量获取多个词库的学习进度统计
 *
 * 请求体: { bookIds: string[] }
 * 返回: { data: { [bookId: string]: { unknown: number, fuzzy: number, known: number } } }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { bookIds } = await request.json()

    if (!Array.isArray(bookIds) || bookIds.length === 0) {
      return NextResponse.json({ error: 'bookIds must be a non-empty array' }, { status: 400 })
    }

    const supabase = await createClient()

    // 一次性查询所有词库的学习进度
    const { data: progressData } = await supabase
      .from('word_progress')
      .select('book_id, status')
      .eq('user_id', user.id)
      .in('book_id', bookIds)

    // 在内存中统计每个词库的数据
    const statsMap: Record<string, { unknown: number, fuzzy: number, known: number }> = {}

    // 初始化所有词库的统计
    for (const bookId of bookIds) {
      statsMap[bookId] = { unknown: 0, fuzzy: 0, known: 0 }
    }

    // 统计数据
    if (progressData) {
      for (const row of progressData) {
        if (statsMap[row.book_id]) {
          if (row.status === 'unknown') statsMap[row.book_id].unknown++
          else if (row.status === 'fuzzy') statsMap[row.book_id].fuzzy++
          else if (row.status === 'known') statsMap[row.book_id].known++
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: statsMap
    })

  } catch (error: any) {
    console.error('[BatchStats] Error:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error.message },
      { status: 500 }
    )
  }
}
