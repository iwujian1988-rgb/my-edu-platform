import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 手动触发今日任务生成（或由 Vercel Cron Job 自动调用）
 *
 * POST /api/v3/learning-plan/schedule
 *
 * 使用场景：
 * 1. Vercel Cron Job 定时自动调用
 * 2. 管理员手动触发测试
 * 3. 前端备选自动触发（当定时任务失败时）
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('🕐 [Cron] Daily task generation started at', new Date().toISOString())

  try {
    const supabase = await createClient()

    // 🔍 检查是否由 Cron Job 调用
    const userAgent = request.headers.get('user-agent') || ''
    const isCronJob = userAgent.includes('vercel-cron') || userAgent.includes('cron')

    if (isCronJob) {
      console.log('✅ [Cron] Called by Vercel Cron Job')
    }

    // ⚠️ Cron Job 调用时跳过认证（因为 Cron Job 没有 session）
    if (!isCronJob) {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // 调用数据库函数触发任务生成
    const { data, error } = await supabase
      .rpc('trigger_daily_task_generation')

    if (error) {
      console.error('❌ [Cron] Failed to trigger daily task generation:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    console.log(`✅ [Cron] Task generation completed in ${duration}ms:`, data)

    return NextResponse.json({
      success: true,
      data,
      meta: {
        triggeredBy: isCronJob ? 'vercel-cron' : 'manual',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`❌ [Cron] Error after ${duration}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        meta: {
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

/**
 * 获取定时任务状态
 *
 * GET /api/v3/learning-plan/schedule
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

    // 查询 pg_cron 定时任务信息（需要管理员权限）
    // 普通用户只能看到基本状态信息
    const { data: plans, error } = await supabase
      .from('learning_plans')
      .select('id, book_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (error) {
      console.error('❌ Failed to fetch active plans:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // 检查今日任务是否已生成
    // 🔧 修复：使用本地时间而不是 UTC 时间
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`

    const { data: todayTasks, error: taskError } = await supabase
      .from('daily_task_records')
      .select('plan_id, task_date')
      .eq('user_id', user.id)
      .eq('task_date', today)

    return NextResponse.json({
      success: true,
      data: {
        active_plans_count: plans?.length || 0,
        today_tasks_count: todayTasks?.length || 0,
        schedule_info: {
          enabled: true,
          schedule: '0 0 * * *', // 每天 00:00
          description: '每天凌晨 00:00 自动生成今日任务'
        }
      }
    })

  } catch (error: any) {
    console.error('❌ GET /api/v3/learning-plan/schedule - Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}
