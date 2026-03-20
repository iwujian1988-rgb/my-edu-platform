/**
 * 填空练习 API
 *
 * GET /api/videos/[id]/exercises
 *
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { hasVideoAccess } from '@/lib/video-permissions'
import type { VideoDifficulty } from '@/types/video'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params

    // 1. 检查用户登录
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // 2. 检查访问权限
    const hasAccess = await hasVideoAccess(user.id, videoId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: '无权访问该视频', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // 3. 解析查询参数
    const { searchParams } = new URL(request.url)
    const difficulty = searchParams.get('difficulty') as VideoDifficulty | null

    // 4. 查询练习
    const supabase = await createClient()
    let query = supabase
      .from('video_exercises')
      .select('*')
      .eq('video_id', videoId)
      .order('display_order', { ascending: true })

    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }

    const { data: exercises, error } = await query

    if (error) {
      console.error('[api/videos/[id]/exercises] Query error:', error)
      return NextResponse.json(
        { success: false, error: '查询失败', code: 'QUERY_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        items: exercises || [],
        total: exercises?.length || 0,
      },
    })
  } catch (error) {
    console.error('[api/videos/[id]/exercises] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
