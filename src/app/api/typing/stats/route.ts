import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/typing/stats
 * 获取打字练习统计数据
 *
 * @see typejishu.md - 接口定义
 * @see TYPING_PRACTICE_PRD.md - 功能需求
 */

/**
 * 获取统计数据
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('❌ GET /api/typing/stats - Unauthorized:', userError)
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: '未登录' },
        { status: 401 }
      )
    }

    // 2. 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get('bookId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 3. 构建查询
    let query = supabase
      .from('learning_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('practice_mode', 'typing')

    // 可选：筛选特定词书
    if (bookId) {
      query = query.eq('book_id', bookId)
    }

    // 可选：日期范围筛选
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // 4. 执行查询
    const { data: records, error: recordsError } = await query

    if (recordsError) {
      console.error('❌ GET /api/typing/stats - Query error:', recordsError)
      return NextResponse.json(
        { success: false, error: 'INTERNAL_ERROR', message: '统计查询失败' },
        { status: 500 }
      )
    }

    // 5. 计算统计数据
    const totalSessions = records?.length || 0
    const totalTimeSpentSeconds = records?.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) || 0
    const totalWordsPracticed = records?.reduce((sum, r) => sum + (r.metadata?.totalWords || 0), 0) || 0
    const averageWpm = totalSessions > 0
      ? records?.reduce((sum, r) => sum + (r.metadata?.wpm || 0), 0) / totalSessions
      : 0
    const averageAccuracy = totalSessions > 0
      ? records?.reduce((sum, r) => sum + (r.metadata?.accuracy || 0), 0) / totalSessions
      : 0

    // 6. 计算每日统计（按日期分组）
    const dailyStatsMap = new Map<string, {
      date: string
      sessions: number
      timeSpentSeconds: number
      wordsPracticed: number
    }>()

    records?.forEach((record) => {
      const date = record.created_at?.split('T')[0] || ''
      if (!date) return

      const existing = dailyStatsMap.get(date)
      if (existing) {
        existing.sessions++
        existing.timeSpentSeconds += record.time_spent_seconds || 0
        existing.wordsPracticed += record.metadata?.totalWords || 0
      } else {
        dailyStatsMap.set(date, {
          date,
          sessions: 1,
          timeSpentSeconds: record.time_spent_seconds || 0,
          wordsPracticed: record.metadata?.totalWords || 0
        })
      }
    })

    const dailyStats = Array.from(dailyStatsMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    // 7. 返回结果
    console.log(`✅ GET /api/typing/stats - Total sessions: ${totalSessions}`)

    return NextResponse.json({
      success: true,
      data: {
        totalSessions,
        totalTimeSpentSeconds,
        totalWordsPracticed,
        averageWpm: Math.round(averageWpm * 10) / 10,  // 保留1位小数
        averageAccuracy: Math.round(averageAccuracy * 1000) / 1000,  // 保留3位小数
        dailyStats
      }
    })

  } catch (error) {
    console.error('❌ Error in GET /api/typing/stats:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
