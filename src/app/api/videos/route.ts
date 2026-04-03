/**
 * 视频列表 API
 *
 * GET /api/videos
 *
 * v7: DB 层排序+分页 — 调用 PostgreSQL 函数 get_published_videos_paginated
 *     移除内存排序和 range hack，每页只从 DB 返回请求的行数
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import type { VideoLanguage, VideoDifficulty, VideoListResponse } from '@/types/video'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

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

    // 1. 并行获取：用户信息 + 标签ID + 学习状态 + 可用语言
    const [userResult, tagResult, progressResult, languagesResult] = await Promise.all([
      supabase
        .from('users')
        .select('package_ids, feature_permissions, permission_expires_at')
        .eq('id', authUser.id)
        .single(),

      // 标签 ID：只需匹配标签名拿到 ID，不再查 video_tag_relations
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

    // 处理用户信息
    const userRow = userResult.data as UserInfo | null
    const userPackageIds = userRow?.package_ids || []
    const featurePermissions = userRow?.feature_permissions
    const permissionExpiresAt = userRow?.permission_expires_at ?? null
    const hasVideoPermission = featurePermissions?.includes('video') &&
      (!permissionExpiresAt || new Date(permissionExpiresAt) > new Date())

    // 2. 获取套餐名称
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

    const userPackages: Array<{ id: string; name: string; expires_at: string | null }> = []
    for (const pkgId of userPackageIds) {
      const pkgName = packageNameMap.get(pkgId)
      if (pkgName) {
        userPackages.push({ id: pkgId, name: pkgName, expires_at: permissionExpiresAt })
      }
    }

    // 提取可用语言
    const availableLanguages = new Set<VideoLanguage>()
    for (const v of (languagesResult.data || [])) {
      if (v.language) {
        availableLanguages.add(v.language as VideoLanguage)
      }
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

    // 8. 构建响应（tag_names 已在 SQL 中聚合，无需前端处理）
    const items = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      thumbnail_url: row.thumbnail_url,
      video_url: row.video_url,
      duration: row.duration,
      language: row.language,
      difficulty: row.difficulty,
      content_type: row.content_type || 'video',
      cover_url: row.cover_url || null,
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
    }))

    return NextResponse.json({
      success: true,
      data: { items, total: totalCount, user_packages: userPackages, available_languages: Array.from(availableLanguages) } as VideoListResponse,
    })
  } catch (error) {
    console.error('[api/videos] Unexpected error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
