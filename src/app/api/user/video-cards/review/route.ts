/**
 * 视频卡片复习 API
 * 基于 SM-2 算法返回待复习的卡片
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  // 获取需要复习的卡片（next_review_at <= now 或 status = unknown）
  const { data: cardProgress, error } = await supabase
    .from('user_card_progress')
    .select('*')
    .eq('user_id', user.id)
    .or(`next_review_at.is.null,next_review_at.lte.${now}`)
    .order('next_review_at', { ascending: true, nullsFirst: true })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 获取卡片详情
  const items = []

  for (const progress of cardProgress || []) {
    let cardData = null
    let tableName = ''

    if (progress.card_type === 'word') {
      tableName = 'video_word_cards'
    } else if (progress.card_type === 'phrase') {
      tableName = 'video_phrase_cards'
    } else if (progress.card_type === 'expression') {
      tableName = 'video_expression_cards'
    }

    if (tableName) {
      const { data } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', progress.card_id)
        .single()

      cardData = data
    }

    if (cardData) {
      // 获取视频标题
      const { data: video } = await supabase
        .from('videos')
        .select('title')
        .eq('id', progress.video_id)
        .single()

      items.push({
        card: {
          ...cardData,
          video_title: video?.title,
        },
        card_type: progress.card_type,
        next_review: progress.next_review_at,
        review_count: progress.review_count,
        ease_factor: progress.ease_factor,
      })
    }
  }

  return NextResponse.json({
    data: {
      items,
      total: items.length,
    },
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { cardId, cardType, quality } = body

  // 获取当前进度
  const { data: current, error: fetchError } = await supabase
    .from('user_card_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .eq('card_type', cardType)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Card progress not found' }, { status: 404 })
  }

  // SM-2 算法计算下次复习时间
  let newEaseFactor = current.ease_factor
  let interval = 1

  if (quality >= 3) {
    // 正确
    if (current.review_count === 0) {
      interval = 1
    } else if (current.review_count === 1) {
      interval = 6
    } else {
      interval = Math.round(current.review_count * current.ease_factor)
    }

    // 更新 ease factor
    newEaseFactor = Math.max(
      1.3,
      current.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )
  } else {
    // 错误，重置间隔
    interval = 1
  }

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  // 更新进度
  const { error: updateError } = await supabase
    .from('user_card_progress')
    .update({
      review_count: current.review_count + 1,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: nextReview.toISOString(),
      ease_factor: newEaseFactor,
      status: quality >= 3 ? 'known' : 'learning',
      updated_at: new Date().toISOString(),
    })
    .eq('id', current.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
