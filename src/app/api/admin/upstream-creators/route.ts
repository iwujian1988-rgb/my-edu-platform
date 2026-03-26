/**
 * UP主管理 API
 * GET /api/admin/upstream-creators - 获取UP主列表
 * POST /api/admin/upstream-creators - 创建UP主
 */

import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI, logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import type { CreatorPlatform } from '@/types/video'

const VALID_PLATFORMS: CreatorPlatform[] = ['youtube', 'bilibili', 'tiktok', 'instagram', 'twitter', 'other']

interface CreatorInput {
  name: string
  platform?: CreatorPlatform
  platform_user_id?: string
  avatar_url?: string
  description?: string
  follower_count?: number
  channel_url?: string
  is_active?: boolean
  display_order?: number
}

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权', code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient()

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')

    let query = supabase
      .from('upstream_creators')
      .select('*')
      .order('display_order', { ascending: true })
      .order('follower_count', { ascending: false })

    if (platform && VALID_PLATFORMS.includes(platform as CreatorPlatform)) {
      query = query.eq('platform', platform)
    }

    if (isActive !== null && isActive !== 'all') {
      query = query.eq('is_active', isActive === 'true')
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching creators:', error)
      return NextResponse.json({ error: '获取UP主列表失败' }, { status: 500 })
    }

    return NextResponse.json({ creators: data, items: data, total: data.length })
  } catch (error) {
    console.error('Error in upstream-creators API:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权', code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    const body: CreatorInput = await request.json()
    const {
      name,
      platform,
      platform_user_id,
      avatar_url,
      description,
      follower_count = 0,
      channel_url,
      is_active = true,
      display_order = 0
    } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'UP主名称不能为空' }, { status: 400 })
    }

    if (platform && !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: '无效的平台类型' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('upstream_creators')
      .insert({
        name: name.trim(),
        platform: platform || null,
        platform_user_id: platform_user_id?.trim() || null,
        avatar_url: avatar_url?.trim() || null,
        description: description?.trim() || null,
        follower_count,
        channel_url: channel_url?.trim() || null,
        is_active,
        display_order
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '该UP主名称已存在' }, { status: 400 })
      }
      console.error('Error creating creator:', error)
      return NextResponse.json({ error: '创建UP主失败' }, { status: 500 })
    }

    await logAdminAction('create_creator', 'upstream_creator', data.id, { name })

    return NextResponse.json({
      success: true,
      creator: data,
      message: 'UP主创建成功'
    })
  } catch (error) {
    console.error('Error in create creator API:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
