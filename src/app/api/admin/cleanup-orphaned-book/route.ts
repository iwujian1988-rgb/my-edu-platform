import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/cleanup-orphaned-book
 * 临时清理接口：删除孤立的词库数据
 */
export async function POST() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const orphanedBookId = '68090a64-edc6-4145-bde3-6cd56997868f'

    // 1. 删除 user_book_preferences
    const { error: prefsError } = await supabase
      .from('user_book_preferences')
      .delete()
      .eq('book_id', orphanedBookId)

    if (prefsError) {
      console.error('删除 user_book_preferences 失败:', prefsError)
    }

    // 2. 删除 books
    const { error: bookError } = await supabase
      .from('books')
      .delete()
      .eq('id', orphanedBookId)

    if (bookError) {
      console.error('删除 books 失败:', bookError)
      return NextResponse.json({
        success: false,
        error: bookError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '孤立数据已清理'
    })
  } catch (error) {
    console.error('清理孤立数据失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    )
  }
}
