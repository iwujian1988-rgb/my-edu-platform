/**
 * 播主详情 API
 *
 * GET /api/creators/[id]
 * 返回播主信息 + 全部已发布内容 + 用户学习进度
 * 支持 sort=time(默认) 和 sort=episode
 *
 * v2: 加入 Redis 缓存
 *     - 播主信息 + 计数缓存 5 分钟（极少变化）
 *     - 内容列表缓存 60 秒
 *     - 用户权限缓存 5 分钟
 *     - 用户进度实时查询
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import { getCached, setCache } from '@/lib/cache/api-cache'
import type { CreatorInfo, CreatorContentResponse, VideoListItem, CreatorSortMode } from '@/types/video'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/** 播主静态信息缓存 TTL */
const CREATOR_CACHE_TTL = 300 // 5 分钟
/** 内容列表缓存 TTL */
const CONTENT_CACHE_TTL = 60 // 1 分钟
/** 用户权限缓存 TTL */
const USER_INFO_CACHE_TTL = 300 // 5 分钟

interface RpcContentRow {
  id: string
  title: string
  original_title: string | null
  album_title: string | null
  description: string | null
  thumbnail_url: string | null
  video_url: string | null
  duration: number | null
  language: string | null
  difficulty: string | null
  content_type: string | null
  cover_url: string | null
  status: string
  display_order: number | null
  creator_name: string | null
  creator_id: string
  source_url: string | null
  view_count: number
  learning_date: string | null
  published_at: string | null
  created_at: string
  updated_at: string | null
  package_ids: string[] | null
  tag_names: string[]
  total_count: number
}

/** 从标题中提取集数编号，用于 episode 排序 */
function extractEpisodeNumber(title: string): number {
  const EPISODE_PATTERNS = [
    /第\s*(\d+)\s*[期集话章回]/,
    /Episode\s*(\d+)/i,
    /#(\d+)/,
    /E(\d{1,4})\b/i,
    /Vol\.?\s*(\d+)/i,
  ]

  for (const pattern of EPISODE_PATTERNS) {
    const match = title.match(pattern)
    if (match) return parseInt(match[1], 10)
  }

  const bareNumber = title.match(/^(?:\d+)[^\d]|[^\d](\d+)$/)
  if (bareNumber) {
    const num = bareNumber[1] || bareNumber[0].replace(/[^\d]/g, '')
    if (num) return parseInt(num, 10)
  }

  return Number.MAX_SAFE_INTEGER
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getCurrentUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id: creatorId } = await params
    const { searchParams } = new URL(request.url)
    const sort = (searchParams.get('sort') || 'time') as CreatorSortMode
    const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)), MAX_LIMIT)
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createAdminClient()
    const needsFullFetch = sort === 'episode'

    // 1. 先获取用户权限（通常命中缓存，极快）
    const userInfoCacheKey = `videos:user_info:${authUser.id}`
    const cachedUserInfo = await getCached<{
      packageIds: string[]
      hasVideoPermission: boolean
      permissionExpiresAt: string | null
      packageNameMap: Array<[string, string]>
    }>(userInfoCacheKey)

    let userPackageIds: string[] = []
    let hasVideoPermission = false
    let packageNameMap = new Map<string, string>()

    if (cachedUserInfo) {
      userPackageIds = cachedUserInfo.packageIds
      hasVideoPermission = cachedUserInfo.hasVideoPermission
      packageNameMap = new Map(cachedUserInfo.packageNameMap)
    } else {
      const { data: userRow } = await supabase
        .from('users')
        .select('package_ids, feature_permissions, permission_expires_at')
        .eq('id', authUser.id)
        .single()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const u = userRow as any
      userPackageIds = u?.package_ids || []
      hasVideoPermission = !!(
        u?.feature_permissions?.includes('video') &&
        (!u?.permission_expires_at || new Date(u.permission_expires_at) > new Date())
      )

      if (userPackageIds.length > 0) {
        const { data: pkgData } = await supabase
          .from('invitation_packages')
          .select('id, name')
          .in('id', userPackageIds)
        if (pkgData) {
          for (const pkg of pkgData) {
            packageNameMap.set(pkg.id, pkg.name || '套餐')
          }
        }
      }

      setCache(userInfoCacheKey, {
        packageIds: userPackageIds,
        hasVideoPermission,
        permissionExpiresAt: u?.permission_expires_at ?? null,
        packageNameMap: Array.from(packageNameMap.entries()),
      }, USER_INFO_CACHE_TTL).catch(() => {})
    }

    // 2. 播主信息 + 内容列表并行（权限已就绪）
    const packageFilterKey = userPackageIds.length > 0 ? userPackageIds.join(',') : 'all'
    const [creatorData, contentData] = await Promise.all([
      // 2a. 播主信息（全局缓存 5 分钟）
      (async () => {
        const cacheKey = `creator:info:${creatorId}`
        const cached = await getCached<CreatorInfo>(cacheKey)
        if (cached) return { data: cached, fromCache: true }

        const [creatorResult, audioCountResult, videoCountResult] = await Promise.all([
          supabase
            .from('upstream_creators')
            .select('id, name, avatar_url, description, platform, platform_user_id, channel_url, follower_count, is_active, display_order')
            .eq('id', creatorId)
            .single(),
          supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', creatorId)
            .eq('status', 'published')
            .eq('content_type', 'audio'),
          supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', creatorId)
            .eq('status', 'published')
            .neq('content_type', 'audio'),
        ])

        if (creatorResult.error || !creatorResult.data) {
          return { data: null, fromCache: false }
        }

        const row = creatorResult.data
        const info: CreatorInfo = {
          id: row.id,
          name: row.name,
          avatar_url: row.avatar_url,
          description: row.description,
          platform: row.platform,
          platform_user_id: row.platform_user_id,
          channel_url: row.channel_url,
          follower_count: row.follower_count || 0,
          is_active: row.is_active ?? true,
          display_order: row.display_order || 0,
          audio_count: audioCountResult.count || 0,
          video_count: videoCountResult.count || 0,
        }

        setCache(cacheKey, info, CREATOR_CACHE_TTL).catch(() => {})
        return { data: info, fromCache: false }
      })(),

      // 2b. 内容列表（缓存 60 秒，按用户套餐隔离）
      (async () => {
        const cacheKey = `creator:content:${creatorId}:${sort}:${packageFilterKey}`
        const cached = await getCached<{ rows: RpcContentRow[]; totalCount: number }>(cacheKey)
        if (cached) return { ...cached, fromCache: true }

        const { data, error } = await supabase.rpc('get_creator_published_content', {
          p_creator_id: creatorId,
          p_limit: needsFullFetch ? MAX_LIMIT : limit,
          p_offset: needsFullFetch ? 0 : offset,
          p_package_ids: userPackageIds.length > 0 ? userPackageIds : null,
          p_has_permission: userPackageIds.length > 0 ? false : hasVideoPermission,
        })

        if (error) return { rows: [], totalCount: 0, fromCache: false }

        const rows = (data || []) as RpcContentRow[]
        let totalCount: number
        let pagedRows: RpcContentRow[]

        if (sort === 'episode') {
          const sortedRows = [...rows].sort((a, b) => {
            return extractEpisodeNumber(a.title) - extractEpisodeNumber(b.title)
          })
          totalCount = sortedRows.length
          pagedRows = sortedRows
        } else {
          totalCount = rows.length > 0 ? rows[0].total_count : 0
          pagedRows = rows
        }

        const result = { rows: pagedRows, totalCount }
        setCache(cacheKey, result, CONTENT_CACHE_TTL).catch(() => {})
        return { ...result, fromCache: false }
      })(),
    ])

    // 2. 验证播主存在
    if (!creatorData.data) {
      return NextResponse.json({ success: false, error: '播主不存在' }, { status: 404 })
    }

    // 3. 获取当页视频的用户进度（唯一实时查询）
    const creatorInfo = creatorData.data
    const { rows: pagedRows, totalCount } = contentData

    // episode 排序时需要二次分页
    let finalRows = pagedRows
    if (sort === 'episode') {
      finalRows = pagedRows.slice(offset, offset + limit)
    }
    const videoIds = finalRows.map(r => r.id)

    let userProgress: Record<string, { last_position: number; max_progress: number; is_completed: boolean }> = {}
    if (videoIds.length > 0) {
      const { data: progressData } = await supabase
        .from('user_video_progress')
        .select('video_id, last_position, max_progress, is_completed')
        .eq('user_id', authUser.id)
        .in('video_id', videoIds)
      if (progressData) {
        for (const p of progressData as Array<{ video_id: string; last_position: number; max_progress: number; is_completed: boolean }>) {
          userProgress[p.video_id] = { last_position: p.last_position, max_progress: p.max_progress, is_completed: p.is_completed }
        }
      }
    }

    // 4. 构建响应
    const creatorAvatar = creatorInfo.avatar_url || null

    const items = finalRows.map((row): VideoListItem => ({
      id: row.id,
      title: row.title,
      original_title: row.original_title,
      album_title: row.album_title,
      description: row.description,
      thumbnail_url: row.thumbnail_url,
      video_url: row.video_url,
      duration: row.duration || 0,
      language: (row.language || 'en') as VideoListItem['language'],
      difficulty: (row.difficulty || 'beginner') as VideoListItem['difficulty'],
      content_type: (() => {
        if (row.content_type === 'audio') return 'audio' as const
        if (/\.(mp3|m4a|wav|ogg|aac|flac|wma)(\?|$)/i.test(row.video_url || '')) return 'audio' as const
        return (row.content_type || 'video') as 'video'
      })(),
      cover_url: row.cover_url || row.thumbnail_url || creatorAvatar,
      status: row.status as VideoListItem['status'],
      display_order: row.display_order || 0,
      creator_name: row.creator_name,
      creator_id: row.creator_id,
      source_url: row.source_url,
      view_count: row.view_count,
      learning_date: row.learning_date,
      created_at: row.created_at,
      published_at: row.published_at,
      updated_at: row.updated_at,
      package_ids: row.package_ids,
      tags: row.tag_names || [],
      packages: row.package_ids?.map(id => packageNameMap.get(id)).filter(Boolean) || [],
      user_progress: userProgress[row.id] || null,
      has_access: hasVideoPermission || (userPackageIds.length > 0 ? row.package_ids?.some(pid => userPackageIds.includes(pid)) : false),
    }))

    const response: CreatorContentResponse = {
      creator: creatorInfo,
      items,
      total: totalCount,
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error('[api/creators/[id]] Unexpected error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
