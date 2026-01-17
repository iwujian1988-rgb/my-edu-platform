import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/mistakes
 * 获取错题列表（支持拼写错题专项练习）
 *
 * @see typejishu.md - 接口定义
 * @see TYPING_PRACTICE_PRD.md - 功能需求
 */

/**
 * 获取错题列表
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('❌ GET /api/mistakes - Unauthorized:', userError)
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: '未登录' },
        { status: 401 }
      )
    }

    // 2. 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get('bookId')
    const isResolved = searchParams.get('isResolved')
    const typingWrongOnly = searchParams.get('typingWrongOnly')
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)

    // 3. 验证必需参数
    if (!bookId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_BOOK_ID', message: '缺少词书ID' },
        { status: 400 }
      )
    }

    // 验证分页参数
    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PAGE_SIZE', message: '每页数量必须在 1-100 之间' },
        { status: 400 }
      )
    }

    if (page < 1) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PAGE', message: '页码必须大于 0' },
        { status: 400 }
      )
    }

    // 4. 计算分页偏移
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // 5. 构建查询
    let query = supabase
      .from('mistakes')
      .select('id, word_id, book_id, wrong_count, typing_wrong_count, last_wrong_at, is_resolved, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .order('typing_wrong_count', { ascending: false })
      .order('last_wrong_at', { ascending: false })

    // 可选：筛选已解决/未解决
    if (isResolved !== null) {
      const resolved = isResolved === 'true'
      query = query.eq('is_resolved', resolved)
    }

    // 可选：仅显示拼写错题
    if (typingWrongOnly === 'true') {
      query = query.gt('typing_wrong_count', 0)
    }

    // 6. 执行查询（带分页）
    const { data: mistakes, error, count } = await query.range(from, to)

    if (error) {
      console.error('❌ GET /api/mistakes - Query error:', error)
      return NextResponse.json(
        { success: false, error: 'INTERNAL_ERROR', message: '查询失败' },
        { status: 500 }
      )
    }

    // 7. 获取单词详细信息
    const wordIds = mistakes?.map(m => m.word_id) || []
    let wordsMap: Record<string, any> = {}

    if (wordIds.length > 0) {
      const { data: words } = await supabase
        .from('words')
        .select('id, word, definition, phonetic')
        .in('id', wordIds)

      words?.forEach((word: any) => {
        wordsMap[word.id] = {
          id: word.id,
          word: word.word,
          definition: word.definition,
          phonetic: word.phonetic
        }
      })
    }

    // 8. 组装响应数据
    const mistakesWithWords = mistakes?.map(mistake => ({
      id: mistake.id,
      word: wordsMap[mistake.word_id] || null,
      wrongCount: mistake.wrong_count,
      typingWrongCount: mistake.typing_wrong_count || 0,
      lastWrongAt: mistake.last_wrong_at,
      isResolved: mistake.is_resolved
    }))

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / pageSize)

    // 9. 返回结果
    console.log(`✅ GET /api/mistakes - Found ${totalCount} mistakes`)

    return NextResponse.json({
      success: true,
      data: {
        mistakes: mistakesWithWords,
        pagination: {
          total: totalCount,
          page,
          pageSize,
          totalPages
        }
      }
    })

  } catch (error) {
    console.error('❌ Error in GET /api/mistakes:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
