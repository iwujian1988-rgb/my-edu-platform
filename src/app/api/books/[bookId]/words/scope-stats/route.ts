import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/books/[bookId]/words/scope-stats
 * 获取指定词库的所有学习范围单词统计（一次性返回）
 * 使用SQL聚合函数优化性能
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

    // 验证书库权限
    const { data: book } = await supabase
      .from('books')
      .select('id, total_words, is_official, created_by')
      .eq('id', bookId)
      .single()

    if (!book) {
      return NextResponse.json({ error: '词库不存在' }, { status: 404 })
    }

    // 自定义词库：只允许创建者访问
    if (book.is_official === false && book.created_by !== user.id) {
      return NextResponse.json({ error: '无权访问此词库' }, { status: 403 })
    }

    // ⚡ 性能优化：使用数据库聚合函数，避免拉取所有数据
    const totalWords = book.total_words || 0

    // 并行执行两个查询（利用数据库索引）
    const [progressResult, mistakesResult] = await Promise.all([
      // 使用 RPC 聚合函数统计各状态单词数（数据库级别统计）
      supabase.rpc('count_words_by_status', { p_book_id: bookId }),
      // 同时查询错题数
      supabase
        .from('mistakes')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', bookId)
    ])

    // 处理统计结果
    let stats = { unknown: 0, fuzzy: 0, known: 0 }

    if (progressResult.data && typeof progressResult.data === 'object') {
      stats = {
        unknown: (progressResult.data as any).unknown || 0,
        fuzzy: (progressResult.data as any).fuzzy || 0,
        known: (progressResult.data as any).known || 0
      }
    } else {
      // 如果 RPC 不可用，回退到原方案（但限制数量）
      const { data: progressData } = await supabase
        .from('word_progress')
        .select('status')
        .eq('book_id', bookId)
        .limit(10000) // 安全限制

      if (progressData) {
        for (const row of progressData) {
          if (row.status === 'unknown') stats.unknown++
          else if (row.status === 'fuzzy') stats.fuzzy++
          else if (row.status === 'known') stats.known++
        }
      }
    }

    const mistakes = mistakesResult.count

    const newCount = Math.max(0, totalWords - stats.unknown - stats.fuzzy - stats.known)

    return NextResponse.json({
      success: true,
      data: {
        all: totalWords,
        unknown: stats.unknown,
        fuzzy: stats.fuzzy,
        new: newCount,
        known: stats.known,
        mistakes: mistakes || 0
      }
    })

  } catch (error) {
    console.error('[ScopeStats] Error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
