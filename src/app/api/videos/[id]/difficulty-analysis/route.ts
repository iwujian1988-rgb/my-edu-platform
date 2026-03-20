/**
 * 难度分析 API
 *
 * GET /api/videos/[id]/difficulty-analysis
 *
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { hasVideoAccess } from '@/lib/video-permissions'
import type { VideoDifficultyAnalysis } from '@/types/video'

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

    // 3. 查询难度分析
    const supabase = await createClient()
    const { data: analysis, error } = await supabase
      .from('video_difficulty_analysis')
      .select('*')
      .eq('video_id', videoId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, 这是正常的
      console.error('[api/videos/[id]/difficulty-analysis] Query error:', error)
      return NextResponse.json(
        { success: false, error: '查询失败', code: 'QUERY_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: (analysis || null) as VideoDifficultyAnalysis | null,
    })
  } catch (error) {
    console.error('[api/videos/[id]/difficulty-analysis] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
