/**
 * 用户录音 API
 *
 * GET  /api/user/recordings?video_id=xxx&subtitle_id=xxx  - 获取录音（懒加载）
 * POST /api/user/recordings                                - 保存录音元数据（OSS 上传由前端完成）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** 录音记录接口 */
interface RecordingRecord {
  id: string
  user_id: string
  video_id: string
  subtitle_id: string | null
  recording_url: string
  duration: number | null
  file_size: number | null
  content_type: string
  created_at: string
}

/** GET 请求：获取录音 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('video_id')
    const subtitleId = searchParams.get('subtitle_id')

    if (!videoId) {
      return NextResponse.json({ error: 'video_id is required' }, { status: 400 })
    }

    let query = supabase
      .from('user_recordings')
      .select('*')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })

    // 如果指定了 subtitle_id，只返回该字幕的录音
    if (subtitleId) {
      query = query.eq('subtitle_id', subtitleId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[recordings GET] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        items: data as RecordingRecord[],
      },
    })
  } catch (error) {
    console.error('[recordings GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST 请求：保存录音元数据（OSS 上传由前端完成） */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 解析 JSON body
    const body = await request.json()
    const { video_id, subtitle_id, recording_url, duration, file_size, content_type } = body

    console.log('[recordings POST] Received:', { video_id, subtitle_id, recording_url, duration, file_size })

    // 参数验证
    if (!video_id) {
      return NextResponse.json({ error: 'video_id is required' }, { status: 400 })
    }
    if (!recording_url) {
      return NextResponse.json({ error: 'recording_url is required' }, { status: 400 })
    }

    // 保存元数据到数据库
    const { data, error } = await supabase
      .from('user_recordings')
      .insert({
        user_id: user.id,
        video_id: video_id,
        subtitle_id: subtitle_id || null,
        recording_url: recording_url,
        duration: duration || null,
        file_size: file_size || null,
        content_type: content_type || 'audio/webm',
      })
      .select()
      .single()

    if (error) {
      console.error('[recordings POST] Insert error:', error)
      return NextResponse.json({ error: 'Failed to save recording metadata', details: error.message }, { status: 500 })
    }

    console.log('[recordings POST] Success:', data)

    return NextResponse.json({
      data: {
        recording: data as RecordingRecord,
      },
    })
  } catch (error) {
    console.error('[recordings POST] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}
