/**
 * 跟读模式进度 API
 *
 * GET  /api/user/shadow-reading-progress?video_id=xxx
 *   → { data: { practicedIds, resumeIndex, mode, speed, updatedAt } | null }
 *
 * PUT  /api/user/shadow-reading-progress
 *   body: { video_id, practiced_subtitle_ids, resume_index, mode, speed }
 *   → upsert（有则更新，无则创建）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createClient } from '@/lib/supabase/server'

// ── GET ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const videoId = request.nextUrl.searchParams.get('video_id')
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '缺少 video_id 参数' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_shadow_reading_progress')
      .select('practiced_subtitle_ids, resume_index, mode, speed, updated_at')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { success: false, error: '查询进度失败' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ success: true, data: null })
    }

    return NextResponse.json({
      success: true,
      data: {
        practicedIds: data.practiced_subtitle_ids as string[],
        resumeIndex: data.resume_index,
        mode: data.mode,
        speed: data.speed,
        updatedAt: data.updated_at,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// ── PUT (upsert) ─────────────────────────────────────
interface ShadowProgressPayload {
  video_id: string
  practiced_subtitle_ids?: string[]
  resume_index?: number
  mode?: string
  speed?: number
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body: ShadowProgressPayload = await request.json().catch(() => ({}))
    const { video_id: videoId, practiced_subtitle_ids, resume_index, mode, speed } = body

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '缺少 video_id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 构建 upsert 数据：只更新传入的字段
    const updateData: Record<string, unknown> = {
      user_id: user.id,
      video_id: videoId,
      updated_at: new Date().toISOString(),
    }

    if (practiced_subtitle_ids !== undefined) {
      updateData.practiced_subtitle_ids = practiced_subtitle_ids
    }
    if (resume_index !== undefined) {
      updateData.resume_index = resume_index
    }
    if (mode !== undefined) {
      updateData.mode = mode
    }
    if (speed !== undefined) {
      updateData.speed = speed
    }

    const { error } = await supabase
      .from('user_shadow_reading_progress')
      .upsert(updateData, {
        onConflict: 'user_id,video_id',
        ignoreDuplicates: false,
      })

    if (error) {
      return NextResponse.json(
        { success: false, error: '保存进度失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}
