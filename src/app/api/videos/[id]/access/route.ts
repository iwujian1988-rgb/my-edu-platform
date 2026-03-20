/**
 * 视频访问权限检查 API
 *
 * GET /api/videos/[id]/access
 *
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { getVideoAccessCheck } from '@/lib/video-permissions'
import type { AccessCheckResponse } from '@/types/video'

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

    // 2. 获取视频访问检查结果
    const accessCheck = await getVideoAccessCheck(user.id, videoId)

    return NextResponse.json({
      success: true,
      data: accessCheck as AccessCheckResponse,
    })
  } catch (error) {
    console.error('[api/videos/[id]/access] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
