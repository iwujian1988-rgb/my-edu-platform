/**
 * 单个视频标签 API
 *
 * PUT: 更新标签
 * DELETE: 删除标签
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const TAG_TYPES = ['topic', 'creator', 'difficulty', 'duration'] as const
type TagType = typeof TAG_TYPES[number]

interface VideoTag {
  id: string
  name: string
  type: TagType
  color: string
  display_order: number
  created_at: string
}

// PUT: 更新标签
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const { tagId } = await params
    const body = await request.json()
    const { name, type, color, display_order } = body

    if (!tagId) {
      return NextResponse.json(
        { success: false, error: '标签ID不能为空' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // 构建更新数据
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: '标签名称不能为空' },
          { status: 400 }
        )
      }

      // 检查名称是否与其他标签重复
      const { data: existing } = await supabase
        .from('video_tags')
        .select('id')
        .eq('name', name.trim())
        .neq('id', tagId)
        .single()

      if (existing) {
        return NextResponse.json(
          { success: false, error: '标签名称已存在' },
          { status: 400 }
        )
      }

      updateData.name = name.trim()
    }

    if (type !== undefined) {
      if (!TAG_TYPES.includes(type)) {
        return NextResponse.json(
          { success: false, error: '无效的标签类型' },
          { status: 400 }
        )
      }
      updateData.type = type
    }

    if (color !== undefined) {
      updateData.color = color
    }

    if (display_order !== undefined) {
      updateData.display_order = display_order
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '没有需要更新的字段' },
        { status: 400 }
      )
    }

    // 更新标签
    const { data, error } = await supabase
      .from('video_tags')
      .update(updateData)
      .eq('id', tagId)
      .select()
      .single()

    if (error) {
      console.error('[video-tags] Update error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: '标签不存在' },
        { status: 404 }
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

// DELETE: 删除标签
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const { tagId } = await params

    if (!tagId) {
      return NextResponse.json(
        { success: false, error: '标签ID不能为空' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // 先删除关联关系
    const { error: relationError } = await supabase
      .from('video_tag_relations')
      .delete()
      .eq('tag_id', tagId)

    if (relationError) {
      console.error('[video-tags] Delete relations error:', relationError)
      // 继续删除标签，因为数据库有 CASCADE
    }

    // 删除标签
    const { error } = await supabase
      .from('video_tags')
      .delete()
      .eq('id', tagId)

    if (error) {
      console.error('[video-tags] Delete error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '标签已删除'
    })
  } catch (err) {
    console.error('[video-tags] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
