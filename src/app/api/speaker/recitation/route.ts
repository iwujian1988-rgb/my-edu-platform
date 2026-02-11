/**
 * 演说家模块 - Step 3 跟读背诵 API
 *
 * 路由：GET/PUT /api/speaker/recitation
 * 功能：保存和获取背诵练习进度
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.6 节（背诵页需求）
 * - TECHNICAL_MODIFICATION_PLAN.md（逻辑隔离）
 * - AI_DEVELOPMENT_GUIDE.md（开发规范）
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET 处理器：获取背诵练习进度
 *
 * @query articleId - 文章 ID
 * @query userId - 用户 ID
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const articleId = searchParams.get('articleId')
  const userId = searchParams.get('userId')

  if (!articleId || !userId) {
    return NextResponse.json(
      { error: 'MISSING_FIELDS', message: '缺少 articleId 或 userId' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('speaker_progress')
      .select('step3_practiced_sentences, step3_mastered_sentences, step3_completed')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .single()

    if (error) {
      // 如果没有找到进度，返回初始状态（不是错误）
      if (error.code === 'PGRST116') {
        console.log('[Recitation API] 未找到进度，返回初始状态')
        return NextResponse.json({
          success: true,
          practicedSentences: [],
          masteredSentences: [],
          completed: false
        })
      }
      throw error
    }

    console.log('[Recitation API] 获取进度成功:', {
      practicedCount: data?.step3_practiced_sentences?.length || 0,
      masteredCount: data?.step3_mastered_sentences?.length || 0,
      completed: data?.step3_completed || false
    })

    return NextResponse.json({
      success: true,
      practicedSentences: data?.step3_practiced_sentences || [],
      masteredSentences: data?.step3_mastered_sentences || [],
      completed: data?.step3_completed || false
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Recitation API] ❌ 获取进度失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * PUT 处理器：保存背诵练习进度
 *
 * @body articleId - 文章 ID
 * @body userId - 用户 ID
 * @body practicedSentences - 已练习的句子索引数组
 * @body masteredSentences - 已掌握的句子索引数组
 * @body completed - 是否全部完成
 */
export async function PUT(request: Request) {
  console.log('[Recitation API] 收到保存进度请求')

  try {
    const body = await request.json()
    const { articleId, userId, practicedSentences, masteredSentences, completed } = body

    // 验证必填字段
    if (!articleId || !userId) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: '缺少 articleId 或 userId' },
        { status: 400 }
      )
    }

    // 验证数据结构
    if (!Array.isArray(practicedSentences)) {
      return NextResponse.json(
        { error: 'INVALID_DATA', message: 'practicedSentences 必须是数组' },
        { status: 400 }
      )
    }

    if (masteredSentences !== undefined && !Array.isArray(masteredSentences)) {
      return NextResponse.json(
        { error: 'INVALID_DATA', message: 'masteredSentences 必须是数组' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 使用 upsert 保存或更新进度
    const { data, error } = await supabase
      .from('speaker_progress')
      .upsert({
        user_id: userId,
        article_id: articleId,
        step3_practiced_sentences: practicedSentences,
        step3_mastered_sentences: masteredSentences || [],
        step3_completed: completed || false,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'user_id,article_id'
      })
      .select()
      .single()

    if (error) {
      console.error('[Recitation API] ❌ 保存进度失败:', error)
      throw error
    }

    console.log('[Recitation API] ✅ 进度保存成功:', {
      practicedCount: practicedSentences.length,
      masteredCount: masteredSentences?.length || 0,
      completed
    })

    return NextResponse.json({
      success: true,
      practicedSentences: data.step3_practiced_sentences,
      masteredSentences: data.step3_mastered_sentences,
      completed: data.step3_completed
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Recitation API] ❌ 保存进度失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
