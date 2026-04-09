/**
 * 播主详情 API
 *
 * GET /api/creators/[id]
 * 返回播主信息 + 全部已发布内容 + 用户学习进度
 * 支持 sort=time(默认) 和 sort=episode
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import type { CreatorInfo, CreatorContentResponse, VideoListItem, CreatorSortMode } from '@/types/video'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

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
    /第\s*(\d+)\s*[期集话章回]/,         // 第3期、第7集
    /Episode\s*(\d+)/i,                   // Episode 7
    /#(\d+)/,                              // #42
    /E(\d{1,4})\b/i,                       // E03
    /Vol\.?\s*(\d+)/i,                     // Vol.5
  ]

  for (const pattern of EPISODE_PATTERNS) {
    const match = title.match(pattern)
    if (match) return parseInt(match[1], 10)
  }

  // 裸数字兜底：标题开头或结尾的纯数字
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

    // 并行：获取播主信息 + 内容列表 + 用户权限 + 音视频计数
    const needsFullFetch = sort === 'episode'

    const [creatorResult, contentResult, userResult, audioCountResult, videoCountResult] = await Promise.all([
      supabase
        .from('upstream_creators')
        .select('id, name, avatar_url, description, platform, platform_user_id, channel_url, follower_count, is_active, display_order')
        .eq('id', creatorId)
        .single(),

      supabase.rpc('get_creator_published_content', {
        p_creator_id: creatorId,
        p_limit: needsFullFetch ? MAX_LIMIT : limit,
        p_offset: needsFullFetch ? 0 : offset,
      }),

      supabase
        .from('users')
        .select('package_ids, feature_permissions, permission_expires_at')
        .eq('id', authUser.id)
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
      return NextResponse.json({ success: false, error: '播主不存在' }, { status: 404 })
    }

    if (contentResult.error) {
      console.error('[api/creators/[id]] RPC error:', contentResult.error)
      return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 })
    }

    const creatorRow = creatorResult.data
    const contentRows = (contentResult.data || []) as RpcContentRow[]

    // 播主音视频数量（从独立 count 查询获取，不受分页影响）
    const audioCount = audioCountResult.count || 0
    const videoCount = videoCountResult.count || 0

    const creatorInfo: CreatorInfo = {
      id: creatorRow.id,
      name: creatorRow.name,
      avatar_url: creatorRow.avatar_url,
      description: creatorRow.description,
      platform: creatorRow.platform,
      platform_user_id: creatorRow.platform_user_id,
      channel_url: creatorRow.channel_url,
      follower_count: creatorRow.follower_count || 0,
      is_active: creatorRow.is_active ?? true,
      display_order: creatorRow.display_order || 0,
      audio_count: audioCount,
      video_count: videoCount,
    }

    // 用户权限
    const userRow = userResult.data as { package_ids: string[] | null; feature_permissions: string[] | null; permission_expires_at: string | null } | null
    const userPackageIds = userRow?.package_ids || []
    const hasVideoPermission = userRow?.feature_permissions?.includes('video') &&
      (!userRow?.permission_expires_at || new Date(userRow.permission_expires_at) > new Date())

    // episode 排序：在 API 层完成内存排序 + 分页；time 排序已由 RPC 分页
    let pagedRows: RpcContentRow[]
    let totalCount: number

    if (sort === 'episode') {
      const sortedRows = [...contentRows].sort((a, b) => {
        const epA = extractEpisodeNumber(a.title)
        const epB = extractEpisodeNumber(b.title)
        return epA - epB
      })
      totalCount = sortedRows.length
      pagedRows = sortedRows.slice(offset, offset + limit)
    } else {
      // time 排序：RPC 已按 limit/offset 分页，total_count 在首行
      totalCount = contentRows.length > 0 ? contentRows[0].total_count : 0
      pagedRows = contentRows
    }
    const videoIds = pagedRows.map(r => r.id)

    // 获取当页视频的用户进度
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

    // 获取套餐名称
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

    // 播主头像用于无封面兜底
    const creatorAvatar = creatorRow.avatar_url || null

    const items = pagedRows.map((row): VideoListItem => ({
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
