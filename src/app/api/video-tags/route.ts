/**
 * 视频标签列表 API
 *
 * GET /api/video-tags
 *
 * 返回所有可用的视频标签，用于筛选下拉框
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

// 标签类型定义
interface VideoTag {
  id: string
  name: string
  type: string
  color: string
  display_order: number
}

interface VideoTagWithCount extends VideoTag {
  video_count: number
}

export async function GET(request: NextRequest) {
  try {
    // 检查用户登录
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // 单次聚合查询：标签 + 视频数量（避免 N+1 查询）
    // 使用子查询统计每个标签的视频数量
    const { data: tags, error } = await supabase
      .from('video_tags')
      .select(`
        id,
        name,
        type,
        color,
        display_order,
        video_tag_relations(count)
      `)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[api/video-tags] Query error:', error)
      return NextResponse.json(
        { success: false, error: '查询失败', code: 'QUERY_ERROR' },
        { status: 500 }
      )
    }

    // 转换响应格式
    const tagsWithCount: VideoTagWithCount[] = (tags || []).map((tag: {
      id: string
      name: string
      type: string
      color: string
      display_order: number
      video_tag_relations: { count: number }[]
    }) => ({
      id: tag.id,
      name: tag.name,
      type: tag.type,
      color: tag.color,
      display_order: tag.display_order,
      video_count: tag.video_tag_relations?.[0]?.count || 0,
    }))

    return NextResponse.json({
      success: true,
      data: tagsWithCount,
    })
  } catch (error) {
    console.error('[api/video-tags] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
