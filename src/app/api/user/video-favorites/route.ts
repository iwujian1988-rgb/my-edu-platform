/**
 * 用户收藏 API
 *
 * 用于收藏视频中的字幕、单词卡、短语卡、表达卡
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 合法的 item_type 值
const VALID_ITEM_TYPES = ['subtitle', 'word_card', 'phrase_card', 'expression_card'] as const
type ItemType = typeof VALID_ITEM_TYPES[number]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const videoId = searchParams.get('video_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // 构建查询
    let query = supabase
      .from('user_favorites')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 如果指定了 video_id，按视频过滤
    if (videoId) {
      query = query.eq('video_id', videoId)
    }

    const { data: favorites, error, count } = await query

    if (error) {
      console.error('[video-favorites] Query error:', error)
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

  return NextResponse.json({
    data: {
      items: favorites || [],
      total: count || 0,
    },
  })
  } catch (err) {
    console.error('[video-favorites] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { item_type, item_id, video_id, note } = body

  // 验证必填字段
  if (!item_type || !item_id) {
    return NextResponse.json(
      { error: 'item_type and item_id are required' },
      { status: 400 }
    )
  }

  // 验证 item_type
  if (!VALID_ITEM_TYPES.includes(item_type)) {
    return NextResponse.json(
      { error: `Invalid item_type. Must be one of: ${VALID_ITEM_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('user_favorites')
    .insert({
      user_id: user.id,
      item_type,
      item_id,
      video_id,
      note,
    })
    .select()
    .single()

  if (error) {
    // 处理唯一约束冲突（已收藏）
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Already favorited' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
