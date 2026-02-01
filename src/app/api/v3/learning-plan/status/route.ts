import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 检查学习计划状态
 *
 * GET /api/v3/learning-plan/status?bookId=xxx
 *
 * 返回：延迟状态、积压信息、完成进度
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const bookId = request.nextUrl.searchParams.get('bookId')
    if (!bookId) {
      return NextResponse.json(
        { success: false, error: 'bookId is required' },
        { status: 400 }
      )
    }

    // 并行调用多个检查函数
    const [delayResult, backlogResult, completionResult] = await Promise.all([
      supabase.rpc('check_plan_delay_status', {
        p_user_id: user.id,
        p_book_id: bookId
      }),
      supabase.rpc('get_backlogged_review_count', {
        p_user_id: user.id,
        p_book_id: bookId,
        p_daily_max_words: 50 // 默认值，前端可以覆盖
      }),
      supabase.rpc('check_book_completion', {
        p_user_id: user.id,
        p_book_id: bookId
      })
    ])

    if (delayResult.error) {
      console.error('❌ Delay check failed:', delayResult.error)
      return NextResponse.json(
        { success: false, error: delayResult.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        delay: delayResult.data,
        backlog: backlogResult.data,
        completion: completionResult.data
      }
    })

  } catch (error: any) {
    console.error('❌ GET /api/v3/learning-plan/status - Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * 更新学习计划状态
 *
 * PUT /api/v3/learning-plan/status
 *
 * Body: { bookId, status }
 * status: 'active' | 'paused' | 'completed' | 'delayed'
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { bookId, status } = body

    if (!bookId || !status) {
      return NextResponse.json(
        { success: false, error: 'bookId and status are required' },
        { status: 400 }
      )
    }

    // 验证状态值
    const validStatuses = ['active', 'paused', 'completed', 'delayed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // 调用数据库函数更新状态
    const { data, error } = await supabase.rpc('toggle_plan_status', {
      p_user_id: user.id,
      p_book_id: bookId,
      p_new_status: status
    })

    if (error) {
      console.error('❌ Failed to update plan status:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Plan status updated:', data)

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error: any) {
    console.error('❌ PUT /api/v3/learning-plan/status - Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}
