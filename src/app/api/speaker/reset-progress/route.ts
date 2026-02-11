/**
 * 演说家模块 - 重置进度 API
 *
 * 路由：PUT /api/speaker/reset-progress
 * 功能：将某个步骤重置为未完成状态（用于重新学习）
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md（重置进度需求）
 * - TECHNICAL_MODIFICATION_PLAN.md（逻辑隔离）
 * - AI_DEVELOPMENT_GUIDE.md（开发规范）
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PUT 处理器：重置步骤为未完成
 *
 * @body articleId - 文章 ID
 * @body userId - 用户 ID
 * @body step - 步骤名称 ('step1' | 'step2' | 'step3' | 'step4')
 */
export async function PUT(request: Request) {
  console.log('[Speaker Reset Progress API] 收到重置进度请求')

  try {
    const body = await request.json()
    const { articleId, userId, step } = body

    // 验证必填字段
    if (!articleId || !userId || !step) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: '缺少 articleId、userId 或 step' },
        { status: 400 }
      )
    }

    // 验证步骤名称
    const validSteps = ['step1', 'step2', 'step3', 'step4']
    if (!validSteps.includes(step)) {
      return NextResponse.json(
        { error: 'INVALID_STEP', message: '无效的步骤名称' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 确定要更新的字段
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // 根据步骤重置对应的完成字段
    switch (step) {
      case 'step1':
        updateData.step1_completed = false
        break
      case 'step2':
        updateData.step2_completed = false
        break
      case 'step3':
        updateData.step3_completed = false
        break
      case 'step4':
        updateData.step4_completed = false
        // Step 4 重置时，也重置整体状态
        updateData.status = 'in_progress'
        updateData.completed_at = null
        break
    }

    // 检查是否还有其他步骤完成，如果没有完成，则重置整体状态
    const { data: existingData } = await supabase
      .from('speaker_progress')
      .select('step1_completed, step2_completed, step3_completed')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .single()

    if (existingData) {
      const hasOtherCompletedSteps =
        (existingData.step1_completed && step !== 'step1') ||
        (existingData.step2_completed && step !== 'step2') ||
        (existingData.step3_completed && step !== 'step3')

      if (!hasOtherCompletedSteps) {
        updateData.status = 'in_progress'
        updateData.completed_at = null
      }
    }

    // 更新进度记录
    const { data, error } = await supabase
      .from('speaker_progress')
      .update(updateData)
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .select()
      .single()

    if (error) {
      console.error('[Speaker Reset Progress API] ❌ 重置失败:', error)
      throw error
    }

    console.log('[Speaker Reset Progress API] ✅ 重置进度成功:', {
      userId,
      articleId,
      step
    })

    return NextResponse.json({
      success: true,
      message: '已重置进度'
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Reset Progress API] ❌ 重置进度失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误，请稍后重试' },
      { status: 500 }
    )
  }
}
