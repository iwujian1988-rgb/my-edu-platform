/**
 * 视频列表 API
 *
 * GET /api/videos
 *
 * 性能优化版本 v3：移除关联查询，使用分开查询
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import type { VideoLanguage, VideoDifficulty, VideoListResponse } from '@/types/video'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export async function GET(request: NextRequest) {
  try {
    const authUser = await getCurrentUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)), MAX_LIMIT)
    const offset = parseInt(searchParams.get('offset') || '0')
    const language = searchParams.get('language') as VideoLanguage | null
    const difficulty = searchParams.get('difficulty') as VideoDifficulty | null
    const tag = searchParams.get('tag')
    const onlyAccessible = searchParams.get('only_accessible') !== 'false'

    // 1. 获取用户信息（不带关联查询）
    const { data: userData } = await supabase
      .from('users')
      .select('id, package_id, feature_permissions, permission_expires_at')
      .eq('id', authUser.id)
      .single()

    const userRow = userData as { package_id: string | null; feature_permissions: string[] | null; permission_expires_at: string | null } | null
    const userPackageId = userRow?.package_id ?? null
    const featurePermissions = userRow?.feature_permissions
    const permissionExpiresAt = userRow?.permission_expires_at ?? null
    const hasVideoPermission = featurePermissions?.includes('video') &&
      (!permissionExpiresAt || new Date(permissionExpiresAt) > new Date())

    // 2. 获取套餐名称（如果有 package_id）
    const userPackages: Array<{ id: string; name: string; expires_at: string | null }> = []
    const packageNameMap = new Map<string, string>()

    if (userPackageId) {
      const { data: pkgData } = await supabase
        .from('invitation_packages')
        .select('id, name')
        .eq('id', userPackageId)
        .single()

      if (pkgData) {
        const pkg = pkgData as { id: string; name: string }
        userPackages.push({ id: userPackageId, name: pkg.name || '套餐', expires_at: permissionExpiresAt })
        packageNameMap.set(userPackageId, pkg.name || '套餐')
      }
    }

    // 3. 标签筛选
    let tagVideoIds: string[] | null = null
    if (tag && tag !== 'all') {
      const { data: tagData } = await supabase
        .from('video_tags')
        .select('id')
        .ilike('name', tag)
        .limit(1)

      if (tagData && tagData.length > 0) {
        const tagId = (tagData[0] as { id: string }).id
        const { data: relations } = await supabase
          .from('video_tag_relations')
          .select('video_id')
          .eq('tag_id', tagId)

        tagVideoIds = relations?.map((r: { video_id: string }) => r.video_id) || []
        if (tagVideoIds.length === 0) {
          return NextResponse.json({ success: true, data: { items: [], total: 0, user_packages: userPackages, available_languages: [] } })
        }
      } else {
        return NextResponse.json({ success: true, data: { items: [], total: 0, user_packages: userPackages, available_languages: [] } })
      }
    }

    // 4. 构建视频查询
    let query = supabase
      .from('videos')
      .select('id, title, description, thumbnail_url, video_url, duration, language, difficulty, status, display_order, creator_name, source_url, view_count, created_at, published_at, updated_at, package_ids, video_tag_relations(video_tags(name))', { count: 'exact' })
      .eq('status', 'published')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 5. 权限过滤
    if (onlyAccessible && !hasVideoPermission) {
      if (userPackageId) {
        query = query.contains('package_ids', [userPackageId])
      } else {
        return NextResponse.json({ success: true, data: { items: [], total: 0, user_packages: userPackages, available_languages: [] } })
      }
    }

    // 6. 筛选条件
    if (language) query = query.eq('language', language)
    if (difficulty) query = query.eq('difficulty', difficulty)
    if (tagVideoIds) query = query.in('id', tagVideoIds)

    // 7. 执行查询
    const { data: videos, error, count } = await query

    if (error) {
      console.error('[api/videos] Query error:', error)
      return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 })
    }

    const videoIds = (videos || []).map((v: { id: string }) => v.id)

    // 8. 获取用户进度
    const userProgress: Record<string, { last_position: number; max_progress: number; is_completed: boolean }> = {}
    if (videoIds.length > 0) {
      const { data: progressData } = await supabase
        .from('user_video_progress')
        .select('video_id, last_position, max_progress, is_completed')
        .eq('user_id', authUser.id)
        .in('video_id', videoIds)

      for (const p of (progressData || []) as Array<{ video_id: string; last_position: number; max_progress: number; is_completed: boolean }>) {
        userProgress[p.video_id] = { last_position: p.last_position, max_progress: p.max_progress, is_completed: p.is_completed }
      }
    }

    // 9. 获取所有可用语言（不受分页限制，用于筛选器显示）
    let languagesQuery = supabase
      .from('videos')
      .select('language')
      .eq('status', 'published')

    // 应用相同的权限过滤
    if (onlyAccessible && !hasVideoPermission && userPackageId) {
      languagesQuery = languagesQuery.contains('package_ids', [userPackageId])
    }

    const { data: allLanguages } = await languagesQuery

    const availableLanguages = new Set<VideoLanguage>()
    for (const v of (allLanguages || [])) {
      if (v.language) {
        availableLanguages.add(v.language as VideoLanguage)
      }
    }

    // 10. 构建响应
    const items = (videos || []).map(video => {
      const v = video as { id: string; package_ids: string[] | null; video_tag_relations?: Array<{ video_tags: { name: string } | null }> }
      return {
        ...video,
        tags: v.video_tag_relations?.map((r: { video_tags: { name: string } | null }) => r.video_tags?.name).filter(Boolean) || [],
        packages: v.package_ids?.map(id => packageNameMap.get(id)).filter(Boolean) || [],
        user_progress: userProgress[v.id] || null,
        has_access: hasVideoPermission || (userPackageId ? v.package_ids?.includes(userPackageId) : false),
      }
    })

    return NextResponse.json({
      success: true,
      data: { items, total: count || 0, user_packages: userPackages, available_languages: Array.from(availableLanguages) } as VideoListResponse,
    })
  } catch (error) {
    console.error('[api/videos] Unexpected error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
