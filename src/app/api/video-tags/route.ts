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

    // 获取所有标签
    const { data: tags, error } = await supabase
      .from('video_tags')
      .select('id, name, type, color, display_order')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[api/video-tags] Query error:', error)
      return NextResponse.json(
        { success: false, error: '查询失败', code: 'QUERY_ERROR' },
        { status: 500 }
      )
    }

    // 获取每个标签的视频数量
    const tagsWithCount: VideoTagWithCount[] = await Promise.all(
      (tags || []).map(async (tag: VideoTag) => {
        const { count } = await supabase
          .from('video_tag_relations')
          .select('*', { count: 'exact', head: true })
          .eq('tag_id', tag.id)

        return {
          ...tag,
          video_count: count || 0,
        }
      })
    )

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
