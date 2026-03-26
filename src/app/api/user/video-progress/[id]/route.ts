/**
 * 视频进度 API
 *
 * POST /api/user/video-progress/[id]
 * 保存用户的视频观看进度
 *
 * PUT /api/user/video-progress/[id]
 * 更新用户的视频观看进度（同 POST）
 *
 * 特殊处理：
 * - max_progress: 取历史最大值（不会倒退）
 * - watch_duration: 累加
 * - is_completed: 一旦为 true，保持不变
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createClient } from '@/lib/supabase/server'

interface ProgressPayload {
  last_position?: number
  max_progress?: number
  watch_duration_increment?: number
  is_completed?: boolean
}

interface ExistingProgress {
  max_progress: number
  watch_duration: number
  is_completed: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id: videoId } = await params
    const body: ProgressPayload = await request.json().catch(() => ({}))

    const {
      last_position = 0,
      max_progress = 0,
      watch_duration_increment = 0,
      is_completed = false,
    } = body

    const supabase = await createClient()

    // 先查询现有进度
    const { data: existing } = await supabase
      .from('user_video_progress')
      .select('max_progress, watch_duration, is_completed')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .maybeSingle()

    const existingProgress = existing as ExistingProgress | null

    // 计算合并后的值
    const mergedMaxProgress = existingProgress
      ? Math.max(existingProgress.max_progress, max_progress)
      : max_progress

    const mergedWatchDuration = existingProgress
      ? existingProgress.watch_duration + watch_duration_increment
      : watch_duration_increment

    const mergedIsCompleted = existingProgress
      ? existingProgress.is_completed || is_completed
      : is_completed

    // 使用 upsert 来创建或更新进度
    const { error } = await supabase
      .from('user_video_progress')
      .upsert(
        {
          user_id: user.id,
          video_id: videoId,
          last_position,
          max_progress: mergedMaxProgress,
          watch_duration: mergedWatchDuration,
          is_completed: mergedIsCompleted,
          completed_at: mergedIsCompleted && !existingProgress?.is_completed
            ? new Date().toISOString()
            : undefined,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,video_id',
          ignoreDuplicates: false,
        }
      )

    if (error) {
      console.error('[api/user/video-progress] Upsert error:', error)
      return NextResponse.json(
        { success: false, error: '保存进度失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/user/video-progress] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PUT 和 POST 行为相同
  return POST(request, { params })
}
