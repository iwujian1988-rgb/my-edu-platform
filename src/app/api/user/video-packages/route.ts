/**
 * 用户已购视频套餐 API
 *
 * GET /api/user/video-packages
 *
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.3
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { getUserVideoPackages, getAccessibleVideoIds } from '@/lib/video-permissions'

export async function GET() {
  try {
    // 1. 检查用户登录
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // 2. 获取用户套餐列表
    const userPackages = await getUserVideoPackages(user.id)

    // 3. 获取可访问的视频 ID 列表
    const accessibleVideoIds = await getAccessibleVideoIds(user.id)

    return NextResponse.json({
      success: true,
      data: {
        items: userPackages.map(p => ({
          id: p.id,
          package_ids: p.package_ids,
          package_name: p.package_name,
          activated_at: p.activated_at,
          expires_at: p.expires_at,
          is_active: p.is_active,
        })),
        accessible_video_ids: accessibleVideoIds,
      },
    })
  } catch (error) {
    console.error('[api/user/video-packages] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
