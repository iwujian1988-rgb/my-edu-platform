/**
 * 继续学习 API
 *
 * GET /api/videos/continue-learning
 * 从 user_video_progress 取用户最近进行中的视频（含播客），不受分页/筛选影响
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import type { VideoListItem } from '@/types/video'

const MAX_ITEMS = 3

interface ProgressRow {
  video_id: string
  last_position: number
  max_progress: number
  is_completed: boolean
  updated_at: string
}

interface VideoRow {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  video_url: string | null
  duration: number | null
  language: string | null
  difficulty: string | null
  content_type: string | null
  cover_url: string | null
  creator_name: string | null
}

export async function GET() {
  try {
    const authUser = await getCurrentUser()
    if (!authUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const supabase = await createAdminClient()

    /* 1. 取最近进行中的进度（未完成，按更新时间倒序） */
    const { data: progressRows, error: progressError } = await supabase
      .from('user_video_progress')
      .select('video_id, last_position, max_progress, is_completed, updated_at')
      .eq('user_id', authUser.id)
      .eq('is_completed', false)
      .gt('max_progress', 0)
      .order('updated_at', { ascending: false })
      .limit(MAX_ITEMS)

    if (progressError || !progressRows || progressRows.length === 0) {
      return NextResponse.json({ success: true, data: { items: [] } })
    }

    const progresses = progressRows as ProgressRow[]
    const videoIds = progresses.map(p => p.video_id)

    /* 2. 取对应视频详情 */
    const { data: videoRows, error: videoError } = await supabase
      .from('videos')
      .select('id, title, description, thumbnail_url, video_url, duration, language, difficulty, content_type, cover_url, creator_name')
      .in('id', videoIds)
      .eq('status', 'published')

    if (videoError || !videoRows) {
      return NextResponse.json({ success: true, data: { items: [] } })
    }

    /* 3. 按 updated_at 顺序组装结果（progress 顺序 = 最近学习顺序） */
    const videoMap = new Map((videoRows as VideoRow[]).map(v => [v.id, v]))

    const items: VideoListItem[] = progresses
      .filter(p => videoMap.has(p.video_id))
      .map(p => {
        const v = videoMap.get(p.video_id)!
        const isAudio = v.content_type === 'audio' || /\.(mp3|m4a|wav|ogg|aac|flac|wma)(\?|$)/i.test(v.video_url || '')
        return {
          id: v.id,
          title: v.title,
          description: v.description,
          thumbnail_url: v.thumbnail_url,
          video_url: v.video_url,
          duration: v.duration || 0,
          language: (v.language || 'en') as VideoListItem['language'],
          difficulty: (v.difficulty || 'beginner') as VideoListItem['difficulty'],
          content_type: isAudio ? 'audio' as const : (v.content_type || 'video') as 'video',
          cover_url: v.cover_url || v.thumbnail_url || null,
          status: 'published' as const,
          display_order: 0,
          creator_name: v.creator_name,
          source_url: null,
          view_count: 0,
          learning_date: null,
          published_at: null,
          created_at: '',
          updated_at: null,
          package_ids: null,
          tags: [],
          packages: [],
          user_progress: {
            last_position: p.last_position,
            max_progress: p.max_progress,
            is_completed: p.is_completed,
          },
          has_access: true,
        }
      })

    return NextResponse.json({ success: true, data: { items } })
  } catch (error) {
    console.error('[api/videos/continue-learning] 异常:', error)
    return NextResponse.json({ success: true, data: { items: [] } })
  }
}
