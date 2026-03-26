/**
 * 视频标签管理 API
 *
 * GET: 获取所有标签
 * POST: 创建新标签
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// 标签类型
const TAG_TYPES = ['topic', 'creator', 'difficulty', 'duration'] as const
type TagType = typeof TAG_TYPES[number]

// 预设颜色
const PRESET_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
]

interface VideoTag {
  id: string
  name: string
  type: TagType
  color: string
  display_order: number
  created_at: string
}

// GET: 获取所有标签
export async function GET() {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('video_tags')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[video-tags] Fetch error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data as VideoTag[]
    })
  } catch (err) {
    console.error('[video-tags] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: 创建新标签
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type = 'topic', color = '#3B82F6', display_order = 0 } = body

    // 验证必填字段
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '标签名称不能为空' },
        { status: 400 }
      )
    }

    // 验证标签类型
    if (!TAG_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: '无效的标签类型' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // 检查名称是否已存在
    const { data: existing } = await supabase
      .from('video_tags')
      .select('id')
      .eq('name', name.trim())
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: '标签名称已存在' },
        { status: 400 }
      )
    }

    // 创建标签
    const { data, error } = await supabase
      .from('video_tags')
      .insert({
        name: name.trim(),
        type,
        color,
        display_order,
      })
      .select()
      .single()

    if (error) {
      console.error('[video-tags] Create error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data as VideoTag
    })
  } catch (err) {
    console.error('[video-tags] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
