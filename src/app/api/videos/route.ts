/**
 * 视频列表 API
 *
 * GET /api/videos
 *
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { getUserVideoPackages, getAccessibleVideoIds } from '@/lib/video-permissions'
import type { VideoLanguage, VideoDifficulty, VideoListResponse } from '@/types/video'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export async function GET(request: NextRequest) {
  try {
    // 1. 检查用户登录
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url)
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)),
      MAX_LIMIT
    )
    const offset = parseInt(searchParams.get('offset') || '0')
    const language = searchParams.get('language') as VideoLanguage | null
    const difficulty = searchParams.get('difficulty') as VideoDifficulty | null
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const onlyAccessible = searchParams.get('only_accessible') !== 'false'

    // 3. 获取用户套餐信息
    const userPackages = await getUserVideoPackages(user.id)
    const accessibleVideoIds = onlyAccessible ? await getAccessibleVideoIds(user.id) : null

    // 4. 构建查询（package_ids 直接在 videos 表，不再关联已删除的 package_video_relations）
    let query = supabase
      .from('videos')
      .select(`
        id,
        title,
        description,
        thumbnail_url,
        video_url,
        duration,
        language,
        difficulty,
        status,
        display_order,
        creator_name,
        source_url,
        view_count,
        created_at,
        published_at,
        updated_at,
        package_ids,
        video_tag_relations(
          video_tags(name)
        )
      `, { count: 'exact' })
      .eq('status', 'published')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 5. 应用筛选条件
    if (language) {
      query = query.eq('language', language)
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }

    if (tag) {
      // 通过子查询筛选标签
      const { data: taggedVideos, error: tagError } = await supabase
        .from('video_tag_relations')
        .select('video_id')
        .ilike('video_tags.name', tag)

      if (!tagError && taggedVideos) {
        const videoIds = taggedVideos.map(t => t.video_id)
        query = query.in('id', videoIds)
      }
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    if (accessibleVideoIds && accessibleVideoIds.length > 0) {
      query = query.in('id', accessibleVideoIds)
    } else if (onlyAccessible && accessibleVideoIds?.length === 0) {
      // 用户没有任何可访问的视频
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          total: 0,
          user_packages: userPackages.map(p => ({
            id: p.id,
            name: p.package_name,
            expires_at: p.expires_at,
          })),
        } as VideoListResponse,
      })
    }

    // 6. 执行查询
    const { data: videos, error, count } = await query

    if (error) {
      console.error('[api/videos] Query error:', error)
      return NextResponse.json(
        { success: false, error: '查询失败', code: 'QUERY_ERROR' },
        { status: 500 }
      )
    }

    // 7. 获取用户进度
    const videoIds = videos?.map(v => v.id) || []
    let userProgress: Record<string, {
      last_position: number
      max_progress: number
      is_completed: boolean
    }> = {}

    if (videoIds.length > 0) {
      const { data: progressData } = await supabase
        .from('user_video_progress')
        .select('video_id, last_position, max_progress, is_completed')
        .eq('user_id', user.id)
        .in('video_id', videoIds)

      if (progressData) {
        for (const p of progressData) {
          userProgress[p.video_id] = {
            last_position: p.last_position,
            max_progress: p.max_progress,
            is_completed: p.is_completed,
          }
        }
      }
    }

    // 7.5 获取套餐名称（从 invitation_packages 表）
    const allPackageIds = new Set<string>()
    for (const video of (videos || [])) {
      const pkgIds = (video as any).package_ids as string[] | null
      if (pkgIds) {
        pkgIds.forEach(id => allPackageIds.add(id))
      }
    }

    const packageNameMap = new Map<string, string>()
    if (allPackageIds.size > 0) {
      const { data: packages } = await supabase
        .from('invitation_packages')
        .select('id, name')
        .in('id', Array.from(allPackageIds))

      if (packages) {
        for (const pkg of packages) {
          packageNameMap.set(pkg.id, pkg.name)
        }
      }
    }

    // 8. 构建响应
    const accessibleSet = new Set(accessibleVideoIds || [])

    const items = (videos || []).map(video => {
      const tags = video.video_tag_relations
        ?.map((r: { video_tags: { name: string } | null }) => r.video_tags?.name)
        .filter(Boolean) || []

      // 从 package_ids 获取套餐名称
      const pkgIds = (video as any).package_ids as string[] | null
      const packages = pkgIds
        ?.map(id => packageNameMap.get(id))
        .filter(Boolean) || []

      return {
        ...video,
        tags,
        packages,
        user_progress: userProgress[video.id] || null,
        has_access: accessibleSet.has(video.id),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: count || 0,
        user_packages: userPackages.map(p => ({
          id: p.id,
          name: p.package_name,
          expires_at: p.expires_at,
        })),
      } as VideoListResponse,
    })
  } catch (error) {
    console.error('[api/videos] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
