/**
 * 学习计划进度查询 API
 *
 * GET /api/v3/learning-plan/progress?bookId=xxx
 * 返回学习计划的总体进度统计
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getLearningPlanProgress } from '@/lib/learning-plan-server'

/**
 * GET /api/v3/learning-plan/progress?bookId=xxx
 * 查询学习计划的总体进度
 *
 * 返回数据:
 * {
 *   success: true,
 *   data: {
 *     totalWords: number,          // 单词书总词数
 *     learnedWords: number,        // 已学单词数
 *     progressPercentage: number,  // 进度百分比 (0-100)
 *     streakDays: number           // 连续打卡天数
 *   }
 * }
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

    // 调用核心函数获取进度
    const progress = await getLearningPlanProgress(user.id, bookId)

    return NextResponse.json({
      success: true,
      data: progress
    })

  } catch (error: any) {
    console.error('❌ GET /api/v3/learning-plan/progress - Error:', error)

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
