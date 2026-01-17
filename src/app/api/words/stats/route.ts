import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { fromZodError } from 'zod-validation-error'
import { cacheService } from '@/lib/cache/redis'

// 对应方案：Section 4.1.1 - 完善的Zod Schema
const GetStatsSchema = z.object({
  bookId: z.string()
    .min(1, 'bookId不能为空')
    .uuid('bookId格式错误')
})

/**
 * GET /api/words/stats?bookId=xxx
 * 对应方案：Section 4.1.1 - 获取统计数据（带缓存）
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({
      success: false,
      error: '未授权访问',
      code: 'UNAUTHORIZED'
    }, { status: 401 })
  }

  try {
    // 对应方案：Section 4.1.1 - 使用parse，自动抛出详细错误
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const { bookId } = GetStatsSchema.parse(searchParams)

    // 对应方案：Section 5.1.2 - 尝试从缓存获取
    const cachedStats = await cacheService.getStats(user.id, bookId)
    if (cachedStats) {
      return NextResponse.json({
        success: true,
        data: cachedStats,
        _cached: true  // 标记来自缓存
      })
    }

    const supabase = await createClient()

    // 对应方案：Section 4.1.1 - 并行检查：权限 + 单词书信息 + 用户进度统计
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
      return NextResponse.json({
        success: false,
        error: '词书不存在或无权访问',
        code: 'BOOK_NOT_FOUND'
      }, { status: 404 })
    }

    const bookData = book as any

    // 自定义词库：检查是否为创建者
    if (bookData.is_official === false && bookData.created_by) {
      if (bookData.created_by !== user.id) {
        return NextResponse.json({
          success: false,
          error: '无权访问此词书',
          code: 'FORBIDDEN'
        }, { status: 403 })
      }
    }

    // 对应方案：Section 4.1.1 - 统计各状态的单词数量
    const totalWords = bookData.total_words || 0
    const stats = {
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

    // 对应方案：Section 5.1.2 - 写入缓存
    await cacheService.setStats(user.id, bookId, stats)

    return NextResponse.json({
      success: true,
      data: stats,
      _cached: false
    })

  } catch (error) {
    // 对应方案：Section 4.1.1 - 完善的错误处理
    if (error instanceof z.ZodError) {
      // 对应方案：Section 4.1.1 - 返回所有验证错误
      return NextResponse.json({
        success: false,
        error: fromZodError(error).message,
        code: 'INVALID_PARAMS',
        details: (error as any).errors
      }, { status: 400 })
    }

    console.error('❌ [Stats API] 服务器错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}
