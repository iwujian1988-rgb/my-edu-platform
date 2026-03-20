/**
 * 视频卡片笔记 API
 *
 * GET /api/user/video-card-notes - 获取笔记列表
 * POST /api/user/video-card-notes - 创建/更新笔记
 * DELETE /api/user/video-card-notes - 删除笔记
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import type { VideoCardNote, CardType } from '@/types/video'

interface NoteRequestBody {
  video_id: string
  card_type: CardType
  card_id: string
  note: string
}

interface NoteQueryParams {
  video_id?: string
  card_type?: CardType
  card_id?: string
}

// GET - 获取笔记列表
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
      { success: false, error: '未登录', code: 'UNAUTHORIZED' },
      { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('video_id')
    const cardType = searchParams.get('card_type') as CardType | null
    const cardId = searchParams.get('card_id') as string | null

    const supabase = await createClient()

    let query = supabase
      .from('video_card_notes')
      .select('*')
      .eq('user_id', user.id)

    if (videoId) {
      query = query.eq('video_id', videoId)
    }
    if (cardType) {
      query = query.eq('card_type', cardType)
    }
    if (cardId) {
      query = query.eq('card_id', cardId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { success: false, error: '获取笔记失败', code: 'QUERY_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { notes: data || [] },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// POST - 创建/更新笔记
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body: NoteRequestBody = await request.json()

    if (!body.video_id || !body.card_type || !body.card_id || !body.note) {
      return NextResponse.json(
        { success: false, error: '参数不完整', code: 'INVALID_PARAMS' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 使用 upsert 插入或更新
    const { data, error } = await supabase
      .from('video_card_notes')
      .upsert({
        user_id: user.id,
        video_id: body.video_id,
        card_type: body.card_type,
        card_id: body.card_id,
        note: body.note,
        updated_at: new Date().toISOString(),
      })
      .select('*')

    if (error) {
      return NextResponse.json(
        { success: false, error: '保存笔记失败', code: 'UPSERT_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { note: data },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// DELETE - 删除笔记
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const cardType = searchParams.get('card_type') as CardType | null
    const cardId = searchParams.get('card_id') as string | null

    if (!cardType || !cardId) {
      return NextResponse.json(
        { success: false, error: '参数不完整', code: 'INVALID_PARAMS' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('video_card_notes')
      .delete()
      .eq('user_id', user.id)
      .eq('card_type', cardType)
      .eq('card_id', cardId)

    if (error) {
      return NextResponse.json(
        { success: false, error: '删除笔记失败', code: 'DELETE_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
