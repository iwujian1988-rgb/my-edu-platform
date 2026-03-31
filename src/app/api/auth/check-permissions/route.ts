import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()

    if (getUserError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 查询用户的 package_id 和 feature_permissions，与 hasAnyVideoPackage 逻辑一致
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('feature_permissions, package_id, permission_expires_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[check-permissions] 查询失败:', profileError)
      return NextResponse.json({ has_video: false }, { status: 200 })
    }

    const featurePermissions = (userData as Record<string, unknown>)?.feature_permissions as string[] | null
    const permissionExpiresAt = (userData as Record<string, unknown>)?.permission_expires_at as string | null
    const packageId = (userData as Record<string, unknown>)?.package_id as string | null

    // 判定：用户是否有视频权限（满足任一即可）
    // 1. feature_permissions 包含 'video' 且未过期
    // 2. 用户的 package_id 关联了至少一个视频
    const hasVideoPermission = featurePermissions?.includes('video') &&
      (!permissionExpiresAt || new Date(permissionExpiresAt) > new Date())

    let hasPackageVideo = false
    if (!hasVideoPermission && packageId) {
      const { data: linkedVideos } = await supabase
        .from('videos')
        .select('id')
        .contains('package_ids', [packageId])
        .eq('status', 'published')
        .limit(1)
      hasPackageVideo = (linkedVideos?.length ?? 0) > 0
    }

    const hasVideo = hasVideoPermission || hasPackageVideo

    console.log('[check-permissions] 结果:', {
      featurePermissions,
      packageId,
      hasVideoPermission,
      hasPackageVideo,
      hasVideo
    })

    return NextResponse.json({ has_video: hasVideo })
  } catch (error) {
    console.error('[check-permissions] 异常:', error)
    return NextResponse.json({ has_video: false }, { status: 200 })
  }
}
