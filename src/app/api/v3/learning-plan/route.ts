/**
 * 学习计划 API
 *
 * POST /api/v3/learning-plan - 创建学习计划
 * GET /api/v3/learning-plan - 查询学习计划
 * DELETE /api/v3/learning-plan?planId=xxx - 删除学习计划
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createLearningPlan, getLearningPlans, deleteLearningPlan as deletePlanServer, updateLearningPlan as updatePlanServer } from '@/lib/learning-plan-server'
import type { CreateLearningPlanRequest, CreateLearningPlanResponse } from '@/types/learning-plan'

/**
 * POST /api/v3/learning-plan
 * 创建新的学习计划
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
    const body = await request.json() as CreateLearningPlanRequest

    // 验证参数
    if (!body.bookId) {
      return NextResponse.json(
        { success: false, error: 'bookId is required' },
        { status: 400 }
      )
    }

    if (!body.dailyNewWords || body.dailyNewWords < 1 || body.dailyNewWords > 100) {
      return NextResponse.json(
        { success: false, error: 'dailyNewWords must be between 1 and 100' },
        { status: 400 }
      )
    }

    // ✨ v4.0: 验证复习比例
    if (!body.reviewRatio || ![1, 2, 3, 4].includes(body.reviewRatio)) {
      return NextResponse.json(
        { success: false, error: 'reviewRatio must be 1, 2, 3, or 4' },
        { status: 400 }
      )
    }

    // 检查是否已有活跃计划
    const existingPlans = await getLearningPlans(user.id, body.bookId)
    const activePlan = existingPlans.find(p => p.status === 'active')

    if (activePlan) {
      return NextResponse.json(
        {
          success: false,
          error: '已存在活跃的学习计划，请先暂停或删除现有计划'
        },
        { status: 409 } // Conflict
      )
    }

    // 创建学习计划
    const plan = await createLearningPlan(user.id, body)

    const response: CreateLearningPlanResponse = {
      success: true,
      data: plan
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error: any) {
    console.error('❌ POST /api/v3/learning-plan - Error:', error)

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
 * GET /api/v3/learning-plan?bookId=xxx
 * 查询用户的学习计划
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

    // 查询学习计划
    const plans = await getLearningPlans(user.id, bookId || undefined)

    return NextResponse.json({
      success: true,
      data: plans
    })

  } catch (error: any) {
    console.error('❌ GET /api/v3/learning-plan - Error:', error)

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
 * DELETE /api/v3/learning-plan?planId=xxx
 * 删除学习计划
 */
export async function DELETE(request: NextRequest) {
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
    const planId = searchParams.get('planId')

    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'planId is required' },
        { status: 400 }
      )
    }

    // 删除学习计划
    await deletePlanServer(user.id, planId)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ DELETE /api/v3/learning-plan - Error:', error)

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
 * PUT /api/v3/learning-plan
 * 更新学习计划
 */
export async function PUT(request: NextRequest) {
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
    const { planId, dailyNewWords, reviewRatio } = body

    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'planId is required' },
        { status: 400 }
      )
    }

    if (!dailyNewWords || dailyNewWords < 1 || dailyNewWords > 100) {
      return NextResponse.json(
        { success: false, error: 'dailyNewWords must be between 1 and 100' },
        { status: 400 }
      )
    }

    // ✨ v4.0: 验证复习比例
    if (!reviewRatio || ![1, 2, 3, 4].includes(reviewRatio)) {
      return NextResponse.json(
        { success: false, error: 'reviewRatio must be 1, 2, 3, or 4' },
        { status: 400 }
      )
    }

    // 更新学习计划 ✨ v4.0
    const updatedPlan = await updatePlanServer(user.id, planId, {
      dailyNewWords,
      reviewRatio
    })

    return NextResponse.json({
      success: true,
      data: updatedPlan
    })

  } catch (error: any) {
    console.error('❌ PUT /api/v3/learning-plan - Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}
