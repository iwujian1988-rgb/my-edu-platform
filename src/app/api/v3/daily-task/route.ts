/**
 * 今日任务 API
 *
 * GET /api/v3/daily-task?bookId=xxx - 获取今日任务（如果不存在则自动生成）
 * POST /api/v3/daily-task - 强制生成新的今日任务
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTodayTask, generateTodayTask } from '@/lib/learning-plan-server'
import type { GetTodayTaskResponse, GenerateTodayTaskResponse } from '@/types/learning-plan'

/**
 * GET /api/v3/daily-task?bookId=xxx
 * 获取今日任务（如果不存在则自动生成）
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get('bookId')

    if (!bookId) {
      return NextResponse.json(
        { success: false, error: 'bookId is required' },
        { status: 400 }
      )
    }

    // 获取今日任务（如果不存在则自动生成）
    const todayTask = await getTodayTask(user.id, bookId)

    const response: GetTodayTaskResponse = {
      success: true,
      data: todayTask
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ GET /api/v3/daily-task - Error:', error)

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
 * POST /api/v3/daily-task
 * 强制生成新的今日任务
 *
 * 请求体: { bookId: string }
 * 响应: { success: true, data: DailyTaskRecord, message?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 解析请求体
    const body = await request.json()

    if (!body.bookId) {
      return NextResponse.json(
        { success: false, error: 'bookId is required' },
        { status: 400 }
      )
    }

    // 强制生成新的今日任务
    const todayTask = await generateTodayTask(user.id, body.bookId)

    const response: GenerateTodayTaskResponse = {
      success: true,
      data: todayTask,
      message: '今日任务已生成'
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error: any) {
    console.error('❌ POST /api/v3/daily-task - Error:', error)

    // 特殊错误处理
    if (error.message === '未找到活跃的学习计划') {
      return NextResponse.json(
        {
          success: false,
          error: '未找到活跃的学习计划，请先创建学习计划'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}
