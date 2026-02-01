/**
 * 学习计划详情 API
 *
 * GET /api/v3/learning-plan/[planId] - 查询计划详情
 * PATCH /api/v3/learning-plan/[planId] - 更新计划设置
 * DELETE /api/v3/learning-plan/[planId] - 删除/暂停计划
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getLearningPlan, updateLearningPlan, deleteLearningPlan } from '@/lib/learning-plan-server'

interface RouteParams {
  params: Promise<{
    planId: string
  }>
}

/**
 * GET /api/v3/learning-plan/[planId]
 * 查询计划详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { planId } = await params

    // 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 查询计划详情
    const plan = await getLearningPlan(user.id, planId)

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: plan
    })

  } catch (error: any) {
    console.error('❌ GET /api/v3/learning-plan/[planId] - Error:', error)

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
 * PATCH /api/v3/learning-plan/[planId]
 * 更新计划设置（如每日学习量）
 *
 * 请求体: {
 *   dailyNewWords?: number
 *   dailyMaxWords?: number
 *   status?: 'active' | 'paused' | 'completed' | 'delayed'
 * }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { planId } = await params

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
    const { dailyNewWords, dailyMaxWords, status } = body

    // 验证参数
    if (dailyNewWords !== undefined && (dailyNewWords < 1 || dailyNewWords > 100)) {
      return NextResponse.json(
        { success: false, error: 'dailyNewWords must be between 1 and 100' },
        { status: 400 }
      )
    }

    if (dailyMaxWords !== undefined && dailyNewWords !== undefined && dailyMaxWords < dailyNewWords) {
      return NextResponse.json(
        { success: false, error: 'dailyMaxWords must be >= dailyNewWords' },
        { status: 400 }
      )
    }

    if (status !== undefined) {
      const validStatuses = ['active', 'paused', 'completed', 'delayed']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // 更新计划
    const updatedPlan = await updateLearningPlan(user.id, planId, {
      dailyNewWords,
      dailyMaxWords,
      status
    })

    return NextResponse.json({
      success: true,
      data: updatedPlan
    })

  } catch (error: any) {
    console.error('❌ PATCH /api/v3/learning-plan/[planId] - Error:', error)

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
 * DELETE /api/v3/learning-plan/[planId]
 * 删除/暂停计划
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { planId } = await params

    // 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 删除计划
    await deleteLearningPlan(user.id, planId)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ DELETE /api/v3/learning-plan/[planId] - Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}
