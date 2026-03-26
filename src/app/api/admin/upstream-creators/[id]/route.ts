/**
 * 单个UP主管理 API
 * GET /api/admin/upstream-creators/[id] - 获取UP主详情
 * PUT /api/admin/upstream-creators/[id] - 更新UP主
 * DELETE /api/admin/upstream-creators/[id] - 删除UP主
 */

import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI, logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import type { CreatorPlatform } from '@/types/video'

const VALID_PLATFORMS: CreatorPlatform[] = ['youtube', 'bilibili', 'tiktok', 'instagram', 'twitter', 'other']

interface CreatorUpdateInput {
  name?: string
  platform?: CreatorPlatform | null
  platform_user_id?: string | null
  avatar_url?: string | null
  description?: string | null
  follower_count?: number
  channel_url?: string | null
  is_active?: boolean
  display_order?: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权', code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    const { id } = await params
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('upstream_creators')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'UP主不存在' }, { status: 404 })
    }

    return NextResponse.json({ creator: data })
  } catch (error) {
    console.error('Error fetching creator:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权', code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    const { id } = await params
    const body: CreatorUpdateInput = await request.json()
    const {
      name,
      platform,
      platform_user_id,
      avatar_url,
      description,
      follower_count,
      channel_url,
      is_active,
      display_order
    } = body

    const supabase = await createAdminClient()

    const { data: oldCreator } = await supabase
      .from('upstream_creators')
      .select('*')
      .eq('id', id)
      .single()

    if (!oldCreator) {
      return NextResponse.json({ error: 'UP主不存在' }, { status: 404 })
    }

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: 'UP主名称不能为空' }, { status: 400 })
    }

    if (platform !== undefined && platform !== null && !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: '无效的平台类型' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    if (name !== undefined) updateData.name = name.trim()
    if (platform !== undefined) updateData.platform = platform
    if (platform_user_id !== undefined) updateData.platform_user_id = platform_user_id?.trim() || null
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url?.trim() || null
    if (description !== undefined) updateData.description = description?.trim() || null
    if (follower_count !== undefined) updateData.follower_count = follower_count
    if (channel_url !== undefined) updateData.channel_url = channel_url?.trim() || null
    if (is_active !== undefined) updateData.is_active = is_active
    if (display_order !== undefined) updateData.display_order = display_order

    const { data, error } = await supabase
      .from('upstream_creators')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '该UP主名称已存在' }, { status: 400 })
      }
      console.error('Error updating creator:', error)
      return NextResponse.json({ error: '更新UP主失败' }, { status: 500 })
    }

    await logAdminAction('update_creator', 'upstream_creator', id, {
      name: (data as Record<string, unknown>).name,
      changes: {
        is_active: { old: (oldCreator as Record<string, unknown>).is_active, new: (data as Record<string, unknown>).is_active }
      }
    })

    return NextResponse.json({
      success: true,
      creator: data,
      message: 'UP主更新成功'
    })
  } catch (error) {
    console.error('Error in update creator API:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权', code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    const { id } = await params
    const supabase = await createAdminClient()

    const { data: creatorData } = await supabase
      .from('upstream_creators')
      .select('name')
      .eq('id', id)
      .single()

    if (!creatorData) {
      return NextResponse.json({ error: 'UP主不存在' }, { status: 404 })
    }

    const { error } = await supabase
      .from('upstream_creators')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting creator:', error)
      return NextResponse.json({ error: '删除UP主失败' }, { status: 500 })
    }

    await logAdminAction('delete_creator', 'upstream_creator', id, {
      name: (creatorData as Record<string, unknown>).name
    })

    return NextResponse.json({
      success: true,
      message: 'UP主已删除'
    })
  } catch (error) {
    console.error('Error in delete creator API:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
