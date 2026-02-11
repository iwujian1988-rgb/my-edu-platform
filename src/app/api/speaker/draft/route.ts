/**
 * 演说家模块 - 听写草稿 API
 *
 * 路由：PUT /api/speaker/draft
 * 功能：自动保存听写草稿
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4-E 节（状态保存与断点）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md（开发指南）
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 草稿数据结构（完全符合 shangwenjie.md 要求）
 */
interface DictationDraft {
  wordInputs: Array<{
    value: string          // 用户输入的单词
    isSkipped: boolean     // 是否放弃
    isFocused: boolean     // 是否聚焦
    isCorrect: boolean | null  // 判分结果
  }>[]
  activeSentenceIndex: number
  skippedWords: number[]   // 明确记录放弃的单词索引
  savedAt: string          // 保存时间戳
}

/**
 * PUT 处理器：保存听写草稿
 *
 * @body articleId - 文章 ID
 * @body userId - 用户 ID
 * @body draft - 草稿数据
 */
export async function PUT(request: Request) {
  console.log('[Speaker Draft API] 收到保存草稿请求')

  try {
    const body = await request.json()
    const { articleId, userId, draft } = body

    // 验证必填字段
    if (!articleId || !userId) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: '缺少 articleId 或 userId' },
        { status: 400 }
      )
    }

    // 验证草稿数据结构
    if (!draft || !draft.wordInputs || !Array.isArray(draft.wordInputs)) {
      return NextResponse.json(
        { error: 'INVALID_DRAFT', message: '草稿数据格式不正确' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 使用 upsert 保存或更新草稿（完全符合 shangwenjie.md 第 2.4-E 节）
    const { data, error } = await supabase
      .from('speaker_progress')
      .upsert({
        user_id: userId,
        article_id: articleId,
        step2_draft: draft,  // 保存完整的草稿数据
        step2_last_sentence_index: draft.activeSentenceIndex,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'user_id,article_id'
      })
      .select()
      .single()

    if (error) {
      console.error('[Speaker Draft API] ❌ 保存草稿失败:', error)
      throw error
    }

    console.log('[Speaker Draft API] ✅ 草稿保存成功')

    return NextResponse.json({
      success: true,
      draft: data.step2_draft
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Draft API] ❌ 保存草稿失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * DELETE 处理器：删除草稿
 *
 * 用户点击"丢弃草稿"时调用，删除服务端草稿数据
 */
export async function DELETE(request: Request) {
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

    // 删除草稿（将 step2_draft 字段设为 null）
    const { error } = await supabase
      .from('speaker_progress')
      .update({
        step2_draft: null,
        step2_last_sentence_index: 0,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('article_id', articleId)

    if (error) {
      throw error
    }

    console.log('[Speaker Draft API] ✅ 草稿删除成功')

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Draft API] ❌ 删除草稿失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * GET 处理器：获取草稿
 *
 * 用于断点恢复逻辑（shangwenjie.md 第 2.4-E 节）
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
      .select('step2_draft, step2_last_sentence_index')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .single()

    if (error) {
      // 如果没有找到草稿，返回 null（不是错误）
      if (error.code === 'PGRST116') {
        console.log('[Speaker Draft API] 未找到草稿')
        return NextResponse.json({
          success: true,
          draft: null
        })
      }
      throw error
    }

    console.log('[Speaker Draft API] 草稿获取成功')

    return NextResponse.json({
      success: true,
      draft: data?.step2_draft,
      lastSentenceIndex: data?.step2_last_sentence_index
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Draft API] ❌ 获取草稿失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
