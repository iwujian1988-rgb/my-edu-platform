import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { getUserPermissions, hasLanguagePermission } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/books/[bookId]
 * 获取单词书详情（带权限检查）
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

    const { data: book, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (error) {
      console.error('Error fetching book:', error)
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // 🔒 安全检查：自定义词库权限验证
    const bookData = book as any

    // 如果是自定义词库（非官方），检查是否为创建者
    if (bookData.is_official === false && bookData.created_by) {
      if (bookData.created_by !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: You can only access your own custom books' },
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

      // 语言权限检查：英语会员不能访问法语/西语词库
      if (!hasLanguagePermission(userPermissions?.languagePackages || ['en'], bookData.language)) {
        return NextResponse.json(
          { error: 'Forbidden: Your subscription does not include this language' },
          { status: 403 }
        )
      }

      if (!hasAllBooks && !userBookIds.includes(bookId)) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to access this book' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: book
    })
  } catch (error) {
    console.error('Error in GET /api/books/[bookId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/books/[bookId] - 删除自定义词库
 * 需要两次确认
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { bookId } = await params

    if (!bookId) {
      return NextResponse.json({ error: '词库ID不能为空' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. 检查词库是否存在
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: '词库不存在' }, { status: 404 })
    }

    // 2. 检查是否为自定义词库（只能删除自定义词库）
    const bookData = book as any
    if (bookData.is_official) {
      return NextResponse.json(
        { error: '不能删除官方词库，只能删除自定义词库' },
        { status: 403 }
      )
    }

    // 3. 检查是否为词库创建者
    if (bookData.created_by !== user.id) {
      return NextResponse.json(
        { error: '只能删除自己创建的词库' },
        { status: 403 }
      )
    }

    // 4. 获取所有章节ID
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id')
      .eq('book_id', bookId)

    const chapterIds = chapters?.map((c: any) => c.id) || []

    // 5. 删除单词进度（word_progress表）
    if (chapterIds.length > 0) {
      // 先获取所有单词ID
      const { data: words } = await supabase
        .from('words')
        .select('id')
        .in('chapter_id', chapterIds)

      const wordIds = words?.map((w: any) => w.id) || []

      // 删除单词进度
      if (wordIds.length > 0) {
        await supabase
          .from('word_progress')
          .delete()
          .eq('book_id', bookId)
          .in('word_id', wordIds)
      }
    }

    // 6. 删除所有单词
    if (chapterIds.length > 0) {
      await supabase
        .from('words')
        .delete()
        .in('chapter_id', chapterIds)
    }

    // 7. 删除该书的所有用户偏好设置（必须在删除书之前，否则会因外键约束失败）
    const { error: prefsDeleteError } = await supabase
      .from('user_book_preferences')
      .delete()
      .eq('book_id', bookId)

    if (prefsDeleteError) {
      console.error('删除用户偏好设置失败:', prefsDeleteError)
      // 非关键错误，继续执行
    }

    // 8. 删除所有章节
    await supabase
      .from('chapters')
      .delete()
      .eq('book_id', bookId)

    // 9. 删除词库
    const { error: deleteError } = await supabase
      .from('books')
      .delete()
      .eq('id', bookId)

    if (deleteError) {
      console.error('Error deleting book:', deleteError)
      return NextResponse.json({ error: '删除词库失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '词库已删除'
    })
  } catch (error) {
    console.error('Error in DELETE /api/books/[bookId]:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
