/**
 * 视频列表 API
 *
 * GET /api/videos
 *
 * 性能优化版本 v6：最大化并行查询，移除冗余查询
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import type { VideoLanguage, VideoDifficulty, VideoListResponse } from '@/types/video'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

// 学习状态类型
type LearnStatus = 'all' | 'learned' | 'unlearned'

// 用户信息类型
interface UserInfo {
  package_ids: string[] | null
  feature_permissions: string[] | null
  permission_expires_at: string | null
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

    // 1. 并行获取：用户信息 + 标签筛选 + 学习状态筛选 + 可用语言
    // 所有独立查询同时进行，无需等待
    const [userResult, tagResult, progressResult, languagesResult] = await Promise.all([
      // 用户信息
      supabase
        .from('users')
        .select('package_ids, feature_permissions, permission_expires_at')
        .eq('id', authUser.id)
        .single(),

      // 标签筛选
      tag && tag !== 'all' ? (async () => {
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
          return { videoIds: relations?.map((r: { video_id: string }) => r.video_id) || [], found: true }
        }
        return { videoIds: [], found: false }
      })() : Promise.resolve({ videoIds: null, found: true }),

      // 学习状态筛选
      learnStatus !== 'all' ? supabase
        .from('user_video_progress')
        .select('video_id')
        .eq('user_id', authUser.id) : Promise.resolve({ data: null }),

      // 可用语言（聚合查询，只获取不重复的语言列表）
      supabase
        .from('videos')
        .select('language')
        .eq('status', 'published'),
    ])

    // 处理用户信息
    const userRow = userResult.data as UserInfo | null
    const userPackageIds = userRow?.package_ids || []
    const featurePermissions = userRow?.feature_permissions
    const permissionExpiresAt = userRow?.permission_expires_at ?? null
    const hasVideoPermission = featurePermissions?.includes('video') &&
      (!permissionExpiresAt || new Date(permissionExpiresAt) > new Date())

    // 2. 获取套餐名称（批量查询所有用户的套餐）
    const packageNameMap = new Map<string, string>()
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

    // 处理套餐
    const userPackages: Array<{ id: string; name: string; expires_at: string | null }> = []
    for (const pkgId of userPackageIds) {
      const pkgName = packageNameMap.get(pkgId)
      if (pkgName) {
        userPackages.push({ id: pkgId, name: pkgName, expires_at: permissionExpiresAt })
      }
    }

    // 处理标签
    const tagVideoIds = tagResult.videoIds
    if (tag && tag !== 'all' && (!tagResult.found || tagVideoIds.length === 0)) {
      return NextResponse.json({ success: true, data: { items: [], total: 0, user_packages: userPackages, available_languages: [] } })
    }

    // 处理学习状态
    const learnedVideoIds = progressResult.data
      ? (progressResult.data as Array<{ video_id: string }>).map(p => p.video_id)
      : null
    if (learnStatus === 'learned' && learnedVideoIds && learnedVideoIds.length === 0) {
      // 从已获取的语言数据中提取可用语言
      const availableLanguages = new Set<VideoLanguage>()
      for (const v of (languagesResult.data || [])) {
        if (v.language) {
          availableLanguages.add(v.language as VideoLanguage)
        }
      }
      return NextResponse.json({ success: true, data: { items: [], total: 0, user_packages: [], available_languages: Array.from(availableLanguages) } })
    }

    // 3. 权限检查
    if (onlyAccessible && !hasVideoPermission && userPackageIds.length === 0) {
      const availableLanguages = new Set<VideoLanguage>()
      for (const v of (languagesResult.data || [])) {
        if (v.language) {
          availableLanguages.add(v.language as VideoLanguage)
        }
      }
      return NextResponse.json({ success: true, data: { items: [], total: 0, user_packages: [], available_languages: Array.from(availableLanguages) } })
    }

    // 4. 构建视频查询 - 获取足够多的数据用于排序
    // 由于需要按 learning_date 或 published_at 兜底排序，先获取更多数据再在内存中排序
    const FETCH_MULTIPLIER = 3 // 获取3倍数据以确保排序后有足够结果
    const fetchLimit = limit * FETCH_MULTIPLIER
    const today = new Date().toISOString().split('T')[0] // 今天日期 YYYY-MM-DD

    let query = supabase
      .from('videos')
      .select('id, title, description, thumbnail_url, video_url, duration, language, difficulty, status, display_order, creator_name, source_url, view_count, learning_date, created_at, published_at, updated_at, package_ids, video_tag_relations(video_tags(name))', { count: 'exact' })
      .eq('status', 'published')
      // 定时发布：隐藏 learning_date > 今天 的视频
      .or(`learning_date.is.null,learning_date.lte.${today}`)
      .order('created_at', { ascending: false })
      .range(0, fetchLimit - 1)

    // 权限过滤
    if (onlyAccessible && !hasVideoPermission && userPackageIds.length > 0) {
      query = query.overlaps('package_ids', userPackageIds)
    }

    // 筛选条件
    if (language) query = query.eq('language', language)
    if (difficulty) query = query.eq('difficulty', difficulty)
    if (tagVideoIds) query = query.in('id', tagVideoIds)

    // 学习状态筛选
    if (learnStatus === 'learned' && learnedVideoIds) {
      query = query.in('id', learnedVideoIds)
    } else if (learnStatus === 'unlearned' && learnedVideoIds && learnedVideoIds.length > 0) {
      query = query.not('id', 'in', `(${learnedVideoIds.join(',')})`)
    }

    // 5. 执行主查询
    const { data: rawVideos, error, count } = await query

    if (error) {
      console.error('[api/videos] Query error:', error)
      return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 })
    }

    // 按 learning_date 排序，如果为空则用 published_at 兜底
    const videos = (rawVideos || []).sort((a, b) => {
      const dateA = a.learning_date || a.published_at || a.created_at
      const dateB = b.learning_date || b.published_at || b.created_at
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    }).slice(offset, offset + limit)

    const videoIds = videos.map((v: { id: string }) => v.id)

    // 6. 获取用户进度（并行处理已在第1步完成）
    let videoProgressResult = { data: [] as Array<{ video_id: string; last_position: number; max_progress: number; is_completed: boolean }> }
    if (videoIds.length > 0) {
      const { data } = await supabase
        .from('user_video_progress')
        .select('video_id, last_position, max_progress, is_completed')
        .eq('user_id', authUser.id)
        .in('video_id', videoIds)
      videoProgressResult = { data: data || [] }
    }

    // 处理进度
    const userProgress: Record<string, { last_position: number; max_progress: number; is_completed: boolean }> = {}
    for (const p of videoProgressResult.data) {
      userProgress[p.video_id] = { last_position: p.last_position, max_progress: p.max_progress, is_completed: p.is_completed }
    }

    // 处理语言（使用第1步已获取的数据）
    const availableLanguages = new Set<VideoLanguage>()
    for (const v of (languagesResult.data || [])) {
      if (v.language) {
        availableLanguages.add(v.language as VideoLanguage)
      }
    }

    // 7. 构建响应
    const items = (videos || []).map(video => {
      const v = video as { id: string; package_ids: string[] | null; video_tag_relations?: Array<{ video_tags: { name: string } | null }> }
      return {
        ...video,
        tags: v.video_tag_relations?.map((r: { video_tags: { name: string } | null }) => r.video_tags?.name).filter(Boolean) || [],
        packages: v.package_ids?.map(id => packageNameMap.get(id)).filter(Boolean) || [],
        user_progress: userProgress[v.id] || null,
        has_access: hasVideoPermission || (userPackageIds.length > 0 ? v.package_ids?.some(pid => userPackageIds.includes(pid)) : false),
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
