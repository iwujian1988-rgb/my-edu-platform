import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { getUserPermissions } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'

type Chapter = {
  id: string
}

/**
 * GET /api/books/[bookId]/words
 * 获取单词书的所有单词（带权限检查）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { bookId } = await params
    const supabase = await createClient()

    // 🔒 安全检查：先检查词库权限
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
          { error: 'Forbidden: You can only access words from your own custom books' },
          { status: 403 }
        )
      }
    }

    // 官方词库：检查用户权限
    if (bookData.is_official === true) {
      const userPermissions = await getUserPermissions()
      const hasAllBooks = userPermissions?.bookPermissions.includes('*') ||
                          userPermissions?.bookPermissions.includes('全部')
      const userBookIds = userPermissions?.bookPermissions || []

      if (!hasAllBooks && !userBookIds.includes(bookId)) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to access this book' },
          { status: 403 }
        )
      }
    }

    // Get all chapters for this book
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id')
      .eq('book_id', bookId)

    if (chaptersError) {
      console.error('Error fetching chapters:', chaptersError)
      return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 })
    }

    if (!chapters || chapters.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const chapterIds = chapters.map((ch: Chapter) => ch.id)

    // Get all words for these chapters
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .in('chapter_id', chapterIds)
      .order('order_index', { ascending: true })

    if (wordsError) {
      console.error('Error fetching words:', wordsError)
      return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: words || []
    })
  } catch (error) {
    console.error('Error in GET /api/books/[bookId]/words:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
