/**
 * 播主列表 API
 *
 * GET /api/creators?action=podcast-zone
 * 返回有音频内容的活跃播主列表
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import { getCached, setCache } from '@/lib/cache/api-cache'
import type { PodcastCreatorListItem } from '@/types/video'

/** 用户权限信息缓存 TTL（秒） */
const USER_INFO_CACHE_TTL = 300

interface RpcCreatorRow {
  id: string
  name: string
  avatar_url: string | null
  description: string | null
  platform: string | null
  audio_count: number
  latest_covers: string[]
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getCurrentUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action !== 'podcast-zone') {
      return NextResponse.json(
        { success: false, error: '无效的 action 参数' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()
    const limit = parseInt(searchParams.get('limit') || '8')

    // 获取用户套餐权限（复用缓存逻辑）
    const userInfoCacheKey = `creators:user_info:${authUser.id}`
    const cached = await getCached<{
      packageIds: string[]
      hasVideoPermission: boolean
    }>(userInfoCacheKey)

    let userPackageIds: string[] = []
    let hasVideoPermission = false

    if (cached) {
      userPackageIds = cached.packageIds
      hasVideoPermission = cached.hasVideoPermission
    } else {
      const { data: userRow } = await supabase
        .from('users')
        .select('package_ids, feature_permissions, permission_expires_at')
        .eq('id', authUser.id)
        .single()

      const userInfo = userRow as {
        package_ids: string[] | null
        feature_permissions: string[] | null
        permission_expires_at: string | null
      } | null

      userPackageIds = userInfo?.package_ids || []
      const featurePermissions = userInfo?.feature_permissions
      const permissionExpiresAt = userInfo?.permission_expires_at ?? null
      hasVideoPermission = !!(
        featurePermissions?.includes('video') &&
        (!permissionExpiresAt || new Date(permissionExpiresAt) > new Date())
      )

      setCache(userInfoCacheKey, {
        packageIds: userPackageIds,
        hasVideoPermission,
      }, USER_INFO_CACHE_TTL).catch(() => {})
    }

    const { data: rpcRows, error } = await supabase.rpc('get_podcast_creators', {
      p_limit: limit,
      p_package_ids: userPackageIds.length > 0 ? userPackageIds : null,
      p_has_permission: userPackageIds.length > 0 ? false : hasVideoPermission,
    })

    if (error) {
      console.error('[api/creators] RPC error:', error)
      return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 })
    }

    const rows = (rpcRows || []) as RpcCreatorRow[]
    const items: PodcastCreatorListItem[] = rows.map(row => ({
      id: row.id,
      name: row.name,
      avatar_url: row.avatar_url,
      description: row.description,
      platform: row.platform as PodcastCreatorListItem['platform'],
      audio_count: Number(row.audio_count),
      latest_covers: row.latest_covers || [],
    }))

    return NextResponse.json({ success: true, data: { items } })
  } catch (error) {
    console.error('[api/creators] Unexpected error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
