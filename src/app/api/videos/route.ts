/**
 * 视频列表 API
 *
 * GET /api/videos
 *
 * v8: 加入 Redis 缓存层
 *     - 用户权限信息缓存 5 分钟（减少 users 表查询）
 *     - 视频列表结果缓存 60 秒（减少 RPC 调用）
 *     - 用户进度实时查询（合并到缓存结果中）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import { getCached, setCache } from '@/lib/cache/api-cache'
import type { VideoLanguage, VideoDifficulty, VideoListResponse, ContentType } from '@/types/video'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/** 用户权限信息缓存 TTL（秒） */
const USER_INFO_CACHE_TTL = 300 // 5 分钟
/** 视频列表缓存 TTL（秒） */
const VIDEO_LIST_CACHE_TTL = 60 // 1 分钟

type LearnStatus = 'all' | 'learned' | 'unlearned'

interface UserInfo {
  package_ids: string[] | null
  feature_permissions: string[] | null
  permission_expires_at: string | null
}

// RPC 返回行类型
interface RpcVideoRow {
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
  status: string
  display_order: number | null
  creator_name: string | null
  source_url: string | null
  view_count: number
  learning_date: string | null
  created_at: string
  published_at: string | null
  updated_at: string | null
  package_ids: string[] | null
  tag_names: string[]
  total_count: number
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

    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)), MAX_LIMIT)
    const offset = parseInt(searchParams.get('offset') || '0')
    const language = searchParams.get('language') as VideoLanguage | null
    const difficulty = searchParams.get('difficulty') as VideoDifficulty | null
    const tag = searchParams.get('tag')
    const learnStatus = (searchParams.get('learnStatus') || 'all') as LearnStatus
    const onlyAccessible = searchParams.get('only_accessible') !== 'false'
    const contentTypeParam = searchParams.get('content_type') as ContentType | null

    // 0. 尝试从缓存获取用户权限信息（5 分钟有效）
    const userInfoCacheKey = `videos:user_info:${authUser.id}`
    let userPackageIds: string[]
    let hasVideoPermission: boolean
    let permissionExpiresAt: string | null
    let userPackages: Array<{ id: string; name: string; expires_at: string | null }>
    let packageNameMap: Map<string, string>

    const cachedUserInfo = await getCached<{
      packageIds: string[]
      hasVideoPermission: boolean
      permissionExpiresAt: string | null
      packages: Array<{ id: string; name: string; expires_at: string | null }>
      packageNameMap: Array<[string, string]>
    }>(userInfoCacheKey)

    if (cachedUserInfo) {
      userPackageIds = cachedUserInfo.packageIds
      hasVideoPermission = cachedUserInfo.hasVideoPermission
      permissionExpiresAt = cachedUserInfo.permissionExpiresAt
      userPackages = cachedUserInfo.packages
      packageNameMap = new Map(cachedUserInfo.packageNameMap)
    } else {
      // 缓存未命中 → 查 DB
      const { data: userRow } = await supabase
        .from('users')
        .select('package_ids, feature_permissions, permission_expires_at')
        .eq('id', authUser.id)
        .single()

      const userInfo = userRow as UserInfo | null
      userPackageIds = userInfo?.package_ids || []
      const featurePermissions = userInfo?.feature_permissions
      permissionExpiresAt = userInfo?.permission_expires_at ?? null
      hasVideoPermission = !!(
        featurePermissions?.includes('video') &&
        (!permissionExpiresAt || new Date(permissionExpiresAt) > new Date())
      )

      // 获取套餐名称
      packageNameMap = new Map<string, string>()
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

      userPackages = []
      for (const pkgId of userPackageIds) {
        const pkgName = packageNameMap.get(pkgId)
        if (pkgName) {
          userPackages.push({ id: pkgId, name: pkgName, expires_at: permissionExpiresAt })
        }
      }

      // 回填缓存（不阻塞响应）
      setCache(userInfoCacheKey, {
        packageIds: userPackageIds,
        hasVideoPermission,
        permissionExpiresAt,
        packages: userPackages,
        packageNameMap: Array.from(packageNameMap.entries()),
      }, USER_INFO_CACHE_TTL).catch(() => {})
    }

    // 1. 并行获取：标签ID + 学习状态 + 可用语言（与用户信息无关的查询）
    const [tagResult, progressResult, languagesResult] = await Promise.all([
      // 标签 ID：只需匹配标签名拿到 ID
      tag && tag !== 'all' ? (async () => {
        const { data: tagData } = await supabase
          .from('video_tags')
          .select('id')
          .ilike('name', tag)
          .limit(1)
        if (tagData && tagData.length > 0) {
          return { tagIds: [(tagData[0] as { id: string }).id], found: true }
        }
        return { tagIds: [], found: false }
      })() : Promise.resolve({ tagIds: null, found: true }),

      learnStatus !== 'all' ? supabase
        .from('user_video_progress')
        .select('video_id')
        .eq('user_id', authUser.id) : Promise.resolve({ data: null }),

      supabase
        .from('videos')
        .select('language')
        .eq('status', 'published'),
    ])

    // 提取可用语言
    const availableLanguages = new Set<VideoLanguage>()
    for (const v of (languagesResult.data || [])) {
      if (v.language) {
        availableLanguages.add(v.language as VideoLanguage)
      }
    }

    // 2. 尝试从缓存获取视频列表（60 秒有效）
    // 缓存 key 包含所有筛选参数，确保不同筛选条件有独立缓存
    const filterHash = [limit, offset, language, difficulty, tag, learnStatus, onlyAccessible, contentTypeParam,
      userPackageIds.join(','), hasVideoPermission].join('|')
    const listCacheKey = `videos:list:${authUser.id}:${filterHash}`

    const cachedList = await getCached<{
      items: Array<Record<string, unknown>>
      total: number
    }>(listCacheKey)

    if (cachedList) {
      // 缓存命中 → 只需实时获取用户进度，合并后返回
      const cachedItems = cachedList.items as Array<Record<string, unknown>>
      const videoIds = cachedItems.map(item => item.id as string)
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

      // 合并实时进度到缓存数据
      const itemsWithProgress = cachedItems.map(item => ({
        ...item,
        user_progress: userProgress[item.id as string] || null,
      }))

      return NextResponse.json({
        success: true,
        data: { items: itemsWithProgress, total: cachedList.total, user_packages: userPackages, available_languages: Array.from(availableLanguages) } as VideoListResponse,
      })
    }

    // 3. 标签名不存在 → 空结果
    if (tag && tag !== 'all' && !tagResult.found) {
      return NextResponse.json({ success: true, data: { items: [], total: 0, user_packages: userPackages, available_languages: Array.from(availableLanguages) } })
    }

    // 4. 学习状态处理
    const learnedVideoIds = progressResult.data
      ? (progressResult.data as Array<{ video_id: string }>).map(p => p.video_id)
      : null
    if (learnStatus === 'learned' && learnedVideoIds && learnedVideoIds.length === 0) {
      return NextResponse.json({ success: true, data: { items: [], total: 0, user_packages: [], available_languages: Array.from(availableLanguages) } })
    }

    // 5. 权限检查：无权限且无套餐 → 空结果
    if (onlyAccessible && !hasVideoPermission && userPackageIds.length === 0) {
      return NextResponse.json({ success: true, data: { items: [], total: 0, user_packages: [], available_languages: Array.from(availableLanguages) } })
    }

    // 6. 调用 DB 层分页函数，排序和分页全部在 PostgreSQL 完成
    const today = new Date().toISOString().split('T')[0]
    const { data: rpcRows, error } = await supabase.rpc('get_published_videos_paginated', {
      p_limit: limit,
      p_offset: offset,
      p_language: language,
      p_difficulty: difficulty,
      p_tag_ids: tagResult.tagIds,
      p_learned_video_ids: learnedVideoIds,
      p_learn_status: learnStatus,
      p_package_ids: userPackageIds.length > 0 ? userPackageIds : null,
      p_has_permission: !onlyAccessible || hasVideoPermission,
      p_today: today,
      p_content_type: contentTypeParam || null,
    })

    if (error) {
      console.error('[api/videos] RPC error:', error)
      return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 })
    }

    const rows = (rpcRows || []) as RpcVideoRow[]
    const totalCount = rows.length > 0 ? rows[0].total_count : 0
    const videoIds = rows.map(r => r.id)

    // 7. 获取当页视频的用户进度
    const userProgress: Record<string, { last_position: number; max_progress: number; is_completed: boolean }> = {}
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

    // 7.5 批量获取 UP主头像（用于无封面时的兜底）
    const creatorAvatarMap = new Map<string, string>()
    const uniqueCreatorNames = [...new Set(rows.map(r => r.creator_name).filter(Boolean))] as string[]
    if (uniqueCreatorNames.length > 0) {
      const { data: creatorRows } = await supabase
        .from('upstream_creators')
        .select('name, avatar_url')
        .in('name', uniqueCreatorNames)
      if (creatorRows) {
        for (const c of creatorRows as Array<{ name: string; avatar_url: string | null }>) {
          if (c.avatar_url) creatorAvatarMap.set(c.name, c.avatar_url)
        }
      }
    }

    // 8. 构建响应
    const items = rows.map(row => {
      const creatorAvatar = row.creator_name ? creatorAvatarMap.get(row.creator_name) : undefined
      const isAudio = row.content_type === 'audio' || /\.(mp3|m4a|wav|ogg|aac|flac|wma)(\?|$)/i.test(row.video_url || '')
      const effectiveCover = isAudio
        ? (row.cover_url || creatorAvatar || row.thumbnail_url || null)
        : (row.thumbnail_url || row.cover_url || null)

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        thumbnail_url: row.thumbnail_url,
        video_url: row.video_url,
        duration: row.duration,
        language: row.language,
        difficulty: row.difficulty,
        content_type: isAudio ? 'audio' : (row.content_type || 'video'),
        cover_url: effectiveCover,
        status: row.status,
        display_order: row.display_order,
        creator_name: row.creator_name,
        source_url: row.source_url,
        view_count: row.view_count,
        learning_date: row.learning_date,
        created_at: row.created_at,
        published_at: row.published_at,
        updated_at: row.updated_at,
        package_ids: row.package_ids,
        tags: row.tag_names,
        packages: row.package_ids?.map(id => packageNameMap.get(id)).filter(Boolean) || [],
        user_progress: userProgress[row.id] || null,
        has_access: hasVideoPermission || (userPackageIds.length > 0 ? row.package_ids?.some(pid => userPackageIds.includes(pid)) : false),
      }
    })

    // 8.5 回填视频列表缓存（不阻塞响应）
    setCache(listCacheKey, { items: items.map(({ user_progress, ...rest }) => rest), total: totalCount }, VIDEO_LIST_CACHE_TTL).catch(() => {})

    return NextResponse.json({
      success: true,
      data: { items, total: totalCount, user_packages: userPackages, available_languages: Array.from(availableLanguages) } as VideoListResponse,
    })
  } catch (error) {
    console.error('[api/videos] Unexpected error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
