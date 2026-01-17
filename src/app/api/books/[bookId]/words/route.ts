import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { getUserPermissions } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'

type Chapter = {
  id: string
}

/**
 * GET /api/books/[bookId]/words
 * 获取指定词库的单词列表（支持表格编辑视图）
 * 支持分页、筛选、搜索、排序
 * 权限要求：词库创建者
 *
 * Updated: 允许最大 pageSize 10000 以支持打字练习模式
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
    const { searchParams } = new URL(request.url)

    // 分页参数
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    // 筛选参数
    const chapterId = searchParams.get('chapterId')
    const search = searchParams.get('search')
    const scope = searchParams.get('scope') // 新增：学习范围筛选

    // 排序参数
    const sortBy = searchParams.get('sortBy') || 'order_index'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // 参数验证
    // 打字练习模式需要加载全部单词，允许更大的 pageSize
    if (page < 1 || pageSize < 10 || pageSize > 10000) {
      return NextResponse.json({ error: '参数错误：page >= 1, pageSize in [10, 10000]' }, { status: 400 })
    }

    const supabase = await createClient()

    // ===== 权限检查 =====
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, is_official, created_by')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: '词库不存在' }, { status: 404 })
    }

    const bookData = book as any

    // 自定义词库：只允许创建者访问
    if (bookData.is_official === false && bookData.created_by !== user.id) {
      return NextResponse.json(
        { error: '您只能查看自己创建的词库的单词' },
        { status: 403 }
      )
    }

    // ===== 构建查询 =====
    let query = supabase
      .from('words')
      .select(`
        *,
        chapters (
          id,
          title
        )
      `, { count: 'exact' })
      .eq('book_id', bookId)

    // 学习范围筛选（打字练习专用）
    if (scope && ['new', 'known', 'fuzzy', 'unknown'].includes(scope)) {
      // 需要根据word_progress筛选
      let progressQuery = supabase
        .from('word_progress')
        .select('word_id')

      if (scope === 'new') {
        // 未标注：没有进度记录的单词需要特殊处理
        // 先获取有进度记录的单词ID，然后排除
        const { data: progressData } = await progressQuery
        const learnedWordIds = progressData?.map(p => p.word_id) || []
        if (learnedWordIds.length > 0) {
          query = query.not('id', 'in', `(${learnedWordIds.join(',')})`)
        }
      } else {
        // known, fuzzy, unknown - 直接筛选status
        progressQuery = progressQuery.eq('status', scope).eq('book_id', bookId)
        const { data: progressData } = await progressQuery
        const wordIds = progressData?.map(p => p.word_id) || []

        if (wordIds.length > 0) {
          query = query.in('id', wordIds)
        } else {
          // 没有符合条件的单词，直接返回空结果
          return NextResponse.json({
            success: true,
            data: [],
            total: 0,
            pagination: {
              page,
              pageSize,
              total: 0,
              totalPages: 0
            }
          })
        }
      }
    }

    // 章节筛选
    if (chapterId) {
      query = query.eq('chapter_id', chapterId)
    }

    // 搜索（模糊匹配单词）
    if (search && search.trim()) {
      query = query.ilike('word', `%${search.trim()}%`)
    }

    // 排序
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy as any, { ascending })

    // 分页
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: words, error, count } = await query

    if (error) {
      console.error('Error fetching words:', error)
      return NextResponse.json({ error: '获取单词列表失败' }, { status: 500 })
    }

    // 处理返回数据，将 chapters 嵌套对象展平为 chapter 字段
    const processedWords = (words || []).map((word: any) => ({
      ...word,
      chapter: word.chapters?.title || null,
      // 删除嵌套的 chapters 对象，避免混淆
      chapters: undefined
    }))

    const total = count || 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      success: true,
      data: processedWords,
      total,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    })
  } catch (error) {
    console.error('Error in GET /api/books/[bookId]/words:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
