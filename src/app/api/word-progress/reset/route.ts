import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/word-progress/reset
 * 重置指定词书的所有学习进度
 * ⚠️ 危险操作：会删除所有单词的学习记录
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { bookId } = body

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. 检查词库权限
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, is_official, created_by')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    const bookData = book as any

    // 自定义词库：检查是否为创建者
    if (bookData.is_official === false && bookData.created_by) {
      if (bookData.created_by !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: You can only reset progress for your own custom books' },
          { status: 403 }
        )
      }
    }

    // 2. 删除该词书的所有学习进度
    const { error: deleteError } = await supabase
      .from('word_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    if (deleteError) {
      console.error('Error deleting word progress:', deleteError)
      return NextResponse.json({ error: 'Failed to reset progress' }, { status: 500 })
    }

    // 3. 同时删除flashcard进度记录
    await supabase
      .from('user_book_preferences')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    console.log(`✅ Reset progress for user ${user.id}, book ${bookId}`)

    return NextResponse.json({
      success: true,
      message: 'Progress reset successfully'
    })
  } catch (error) {
    console.error('Error in POST /api/word-progress/reset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
