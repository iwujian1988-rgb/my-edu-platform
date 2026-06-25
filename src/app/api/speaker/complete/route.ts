/**
 * 演说家模块 - 完课确认 API
 *
 * 路由：PUT /api/speaker/complete
 * 功能：标记某个步骤为已完成
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.7 节（完课确认）
 * - TECHNICAL_MODIFICATION_PLAN.md（逻辑隔离）
 * - AI_DEVELOPMENT_GUIDE.md（开发规范）
 */

import { NextResponse } from 'next/server'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import type { ProgressStatus } from '@/types/speaker'
import type { SupabaseClient } from '@supabase/supabase-js'

type CompletionStep = 'step1' | 'step2' | 'step3_words' | 'step3' | 'step4'
type CompletionUpdate = {
  updated_at: string
  step1_completed?: boolean
  step2_completed?: boolean
  step3_words_completed?: boolean
  step3_completed?: boolean
  step4_completed?: boolean
  status?: ProgressStatus
  completed_at?: string
}

/**
 * PUT 处理器：标记步骤完成
 *
 * @body articleId - 文章 ID
 * @body userId - 用户 ID
 * @body step - 步骤名称 ('step1' | 'step2' | 'step3' | 'step4')
 */
export async function PUT(request: Request) {
  console.log('[Speaker Complete API] 收到完课确认请求')

  try {
    const body = await request.json()
    const { articleId, step } = body
    const user = await getCurrentUser()

    // 验证必填字段
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 }
      )
    }

    if (!articleId || !step) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: '缺少 articleId 或 step' },
        { status: 400 }
      )
    }

    // 验证步骤名称
    const validSteps: CompletionStep[] = ['step1', 'step2', 'step3_words', 'step3', 'step4']
    if (!validSteps.includes(step as CompletionStep)) {
      return NextResponse.json(
        { error: 'INVALID_STEP', message: '无效的步骤名称' },
        { status: 400 }
      )
    }

    const supabase = await createClient() as SupabaseClient

    // 确定要更新的字段
    const updateData: CompletionUpdate = {
      updated_at: new Date().toISOString()
    }

    // 根据步骤设置对应的完成字段
    switch (step) {
      case 'step1':
        updateData.step1_completed = true
        break
      case 'step2':
        updateData.step2_completed = true
        break
      case 'step3_words':
        updateData.step3_words_completed = true
        break
      case 'step3':
        updateData.step3_completed = true
        break
      case 'step4':
        updateData.step4_completed = true
        // Step 4 完成时，整体状态也设为完成
        updateData.status = 'completed'
        updateData.completed_at = new Date().toISOString()
        break
    }

    // 使用 upsert 保存或更新进度
    const { data, error } = await supabase
      .from('speaker_progress')
      .upsert({
        user_id: user.id,
        article_id: articleId,
        ...updateData
      },
      {
        onConflict: 'user_id,article_id'
      })
      .select()
      .single()

    if (error) {
      console.error('[Speaker Complete API] ❌ 保存失败:', error)
      throw error
    }

    console.log('[Speaker Complete API] ✅ 完课确认成功:', {
      userId: user.id,
      articleId,
      step
    })

    return NextResponse.json({
      success: true,
      message: '已完成标记'
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Complete API] ❌ 完课确认失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误，请稍后重试' },
      { status: 500 }
    )
  }
}
