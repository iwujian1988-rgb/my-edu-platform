/**
 * 演说家模块 - 学习进度 API
 *
 * 路由：PUT /api/speaker/progress
 * 功能：更新用户学习进度
 */

import { NextResponse } from 'next/server'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { upsertSpeakerProgress } from '@/lib/speaker-data'
import type { SpeakerProgress } from '@/types/speaker'

type SpeakerProgressUpdate = Partial<Pick<
  SpeakerProgress,
  | 'step1_completed'
  | 'step1_last_position'
  | 'step2_completed'
  | 'step2_draft'
  | 'step2_last_sentence_index'
  | 'step3_words_completed'
  | 'step3_completed'
  | 'step3_practiced_sentences'
  | 'step4_completed'
  | 'status'
  | 'completed_at'
>>

const ALLOWED_PROGRESS_FIELDS: Array<keyof SpeakerProgressUpdate> = [
  'step1_completed',
  'step1_last_position',
  'step2_completed',
  'step2_draft',
  'step2_last_sentence_index',
  'step3_words_completed',
  'step3_completed',
  'step3_practiced_sentences',
  'step4_completed',
  'status',
  'completed_at'
]

function pickProgressUpdate(body: Record<string, unknown>): SpeakerProgressUpdate {
  return ALLOWED_PROGRESS_FIELDS.reduce<SpeakerProgressUpdate>((update, field) => {
    if (field in body) {
      return {
        ...update,
        [field]: body[field]
      }
    }
    return update
  }, {})
}

/**
 * PUT 处理器：更新学习进度
 *
 * @body articleId - 文章 ID
 * @body step1_last_position - Step 1 上次播放位置
 * @body step1_completed - Step 1 是否完成
 * @body step2_* - Step 2 相关字段
 * @body step3_* - Step 3 相关字段
 * @body step4_completed - Step 4 是否完成
 *
 * @returns { success: boolean, progress: SpeakerProgress }
 *
 * @example
 * PUT /api/speaker/progress
 * {
 *   "articleId": "uuid-xxx",
 *   "step1_last_position": 45.5,
 *   "step1_completed": false
 * }
 */
export async function PUT(request: Request) {
  console.log('[Speaker Progress API] 收到更新进度请求')

  try {
    const body = await request.json()
    const { articleId } = body
    const progressData = pickProgressUpdate(body)

    // 验证必填字段
    if (!articleId) {
      return NextResponse.json(
        { error: 'MISSING_ARTICLE_ID', message: '缺少文章 ID' },
        { status: 400 }
      )
    }

    console.log('[Speaker Progress API] 更新进度:', { articleId, progressData })

    // 获取当前登录用户
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 }
      )
    }

    // 创建 Supabase 客户端
    const supabase = await createClient()

    // 更新进度
    const progress = await upsertSpeakerProgress(supabase, {
      user_id: user.id,
      article_id: articleId,
      ...progressData
    })

    console.log('[Speaker Progress API] ✅ 进度更新成功')

    return NextResponse.json({
      success: true,
      progress
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Progress API] ❌ 更新进度失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
