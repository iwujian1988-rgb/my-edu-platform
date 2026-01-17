import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/books/{bookId}/chapters
 * 获取指定词库的所有章节，按 order_index 排序
 * 权限要求：登录用户，且只能访问自己创建的自定义词库
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { bookId } = await params
    const { searchParams } = new URL(request.url)
    const includeWordCount = searchParams.get('includeWordCount') === 'true'

    const supabase = await createClient()

    // ===== 权限检查：验证词库权限 =====
    console.log('📚 Chapters API (GET) - Fetching book for bookId:', bookId, 'user:', user.id)

    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, created_by, is_official')
      .eq('id', bookId)
      .single()

    if (bookError) {
      console.error('📚 Chapters API (GET) - Book query error for bookId', bookId, ':', bookError)
      return NextResponse.json({
        error: '查询词库失败',
        details: bookError.message
      }, { status: 500 })
    }

    if (!book) {
      console.error('📚 Chapters API (GET) - Book not found for id:', bookId)
      return NextResponse.json({ error: '词库不存在' }, { status: 404 })
    }

    console.log('📚 Chapters API (GET) - Book found:', book)

    const bookData = book as any

    // 自定义词库：只能创建者访问
    if (bookData.is_official === false && bookData.created_by !== user.id) {
      return NextResponse.json(
        { error: '您只能查看自己创建的词库的章节' },
        { status: 403 }
      )
    }

    // ===== 查询章节列表 =====
    let query = supabase
      .from('chapters')
      .select('*')
      .eq('book_id', bookId)
      .order('order_index', { ascending: false })

    const { data: chapters, error: chaptersError } = await query

    if (chaptersError) {
      console.error('Error fetching chapters:', chaptersError)
      return NextResponse.json({ error: '获取章节列表失败' }, { status: 500 })
    }

    // ===== 可选：包含单词统计 =====
    let result = chapters || []

    if (includeWordCount && result.length > 0) {
      // 为每个章节附加单词数量
      const chaptersWithCount = await Promise.all(
        result.map(async (chapter) => {
          const { count } = await supabase
            .from('words')
            .select('*', { count: 'exact', head: true })
            .eq('chapter_id', chapter.id)

          return {
            ...chapter,
            word_count: count || 0
          }
        })
      )
      result = chaptersWithCount
    }

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error in GET /api/books/[bookId]/chapters:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * POST /api/books/{bookId}/chapters
 * 为指定词库创建新章节
 * 权限要求：登录用户，且必须是词库创建者
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { bookId } = await params
    const body = await request.json()
    const { title, order_index } = body

    // ===== 参数验证 =====
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: '章节标题不能为空' }, { status: 400 })
    }

    if (title.length > 50) {
      return NextResponse.json(
        { error: '章节标题不能超过50个字符' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // ===== 权限检查：验证词库权限 =====
    console.log('📚 Chapters API (POST) - Creating chapter for bookId:', bookId, 'user:', user.id)

    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, created_by, is_official, total_words, total_chapters')
      .eq('id', bookId)
      .single()

    if (bookError) {
      console.error('📚 Chapters API (POST) - Book query error for bookId', bookId, ':', bookError)
      return NextResponse.json({
        error: '查询词库失败',
        details: bookError.message
      }, { status: 500 })
    }

    if (!book) {
      console.error('📚 Chapters API (POST) - Book not found for id:', bookId)
      return NextResponse.json({ error: '词库不存在' }, { status: 404 })
    }

    console.log('📚 Chapters API (POST) - Book found:', book)

    const bookData = book as any

    if (bookData.is_official === false && bookData.created_by !== user.id) {
      return NextResponse.json(
        { error: '您只能管理自己创建的词库' },
        { status: 403 }
      )
    }

    if (bookData.is_official === true) {
      return NextResponse.json(
        { error: '官方词库不支持章节管理' },
        { status: 403 }
      )
    }

    // ===== 检查标题重复 =====
    const { data: existingChapter } = await supabase
      .from('chapters')
      .select('id')
      .eq('book_id', bookId)
      .eq('title', title.trim())
      .maybeSingle()

    if (existingChapter) {
      return NextResponse.json({ error: '章节标题已存在' }, { status: 400 })
    }

    // ===== 自动计算 order_index =====
    let finalOrderIndex = order_index

    if (order_index === undefined) {
      // 自动设置为最后一个
      const { data: maxOrderChapter } = await supabase
        .from('chapters')
        .select('order_index')
        .eq('book_id', bookId)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle()

      finalOrderIndex = (maxOrderChapter?.order_index || 0) + 1
    } else {
      // 手动指定：需要调整其他章节的顺序
      // 先查询所有需要移动的章节
      const { data: chaptersToMove } = await supabase
        .from('chapters')
        .select('id, order_index')
        .eq('book_id', bookId)
        .gte('order_index', order_index)
        .order('order_index', { ascending: true })

      if (chaptersToMove && chaptersToMove.length > 0) {
        // 在客户端为每个章节的 order_index +1
        const updates = chaptersToMove.map(chapter => ({
          id: chapter.id,
          order_index: (chapter as any).order_index + 1
        }))

        // 批量更新
        for (const update of updates) {
          await supabase
            .from('chapters')
            .update({ order_index: update.order_index })
            .eq('id', update.id)
        }
      }
    }

    // ===== 插入章节 =====
    const { data: newChapter, error: insertError } = await supabase
      .from('chapters')
      .insert({
        book_id: bookId,
        title: title.trim(),
        order_index: finalOrderIndex,
        word_count: 0,
        is_default: false
      } as any)
      .select()
      .single()

    if (insertError || !newChapter) {
      console.error('Error creating chapter:', insertError)
      return NextResponse.json({ error: '创建章节失败' }, { status: 500 })
    }

    // ===== 更新词库统计 =====
    await supabase
      .from('books')
      .update({
        total_chapters: supabase.rpc('total_chapters + 1') as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookId)

    return NextResponse.json({
      success: true,
      data: newChapter
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/books/[bookId]/chapters:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
