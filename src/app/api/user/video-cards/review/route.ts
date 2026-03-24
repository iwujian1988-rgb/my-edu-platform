/**
 * 视频卡片复习 API
 *
 * GET: 返回待复习的卡片（基于 SM-2 算法）
 * POST: 提交复习结果并更新下次复习时间
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CardType, VideoCard } from '@/types/video'

// 卡片类型对应的表名
const CARD_TABLES: Record<CardType, string> = {
  word: 'video_word_cards',
  phrase: 'video_phrase_cards',
  expression: 'video_expression_cards',
}

// 获取卡片进度
// - 默认返回待复习卡片 (next_review_at <= now 或 null)
// - 传入 all=true 返回所有卡片进度（用于显示学习状态）
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('video_id')
    const cardType = searchParams.get('card_type') as CardType | null
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const getAll = searchParams.get('all') === 'true'

    const now = new Date().toISOString()

    // 构建查询
    let query = supabase
      .from('user_card_progress')
      .select('*')
      .eq('user_id', user.id)

    // 只在非 all 模式下过滤待复习卡片
    if (!getAll) {
      query = query.or(`next_review_at.is.null,next_review_at.lte.${now}`)
    }

    query = query.order('next_review_at', { ascending: true, nullsFirst: true })
      .limit(limit)

    if (videoId) {
      query = query.eq('video_id', videoId)
    }
    if (cardType) {
      query = query.eq('card_type', cardType)
    }

    const { data: cardProgress, error } = await query

    if (error) {
      console.error('[review GET] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 获取卡片详情和视频信息
    const items = []

    for (const progress of cardProgress || []) {
      const tableName = CARD_TABLES[progress.card_type as CardType]
      if (!tableName) continue

      // 获取卡片数据
      const { data: cardData } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', progress.card_id)
        .single()

      if (!cardData) continue

      // 获取视频信息
      const { data: video } = await supabase
        .from('videos')
        .select('title, language')
        .eq('id', progress.video_id)
        .single()

      // 构建统一的卡片格式
      const card: VideoCard = {
        id: cardData.id,
        video_id: progress.video_id,
        video_title: video?.title,
        text: '',
        translation: '',
        phonetic: cardData.phonetic,
        examples: [],
      }

      // 根据卡片类型填充数据
      switch (progress.card_type as CardType) {
        case 'word':
          card.text = cardData.word
          card.translation = cardData.chinese_definition
          card.part_of_speech = cardData.part_of_speech
          card.definition = cardData.english_definition
          if (cardData.example_from_video) {
            card.examples = [{
              original: cardData.example_from_video,
              translation: cardData.example_translation,
            }]
          }
          break
        case 'phrase':
          card.text = cardData.phrase
          card.translation = cardData.chinese_definition
          if (cardData.context) {
            card.examples = [{
              original: cardData.context,
              translation: cardData.context_translation,
            }]
          }
          break
        case 'expression':
          card.text = cardData.expression
          card.translation = cardData.meaning || ''
          card.formula = cardData.formula
          card.usage_note = cardData.usage_note
          card.scenarios = cardData.scenarios
          card.examples = cardData.examples || []
          break
      }

      items.push({
        card,
        card_type: progress.card_type as CardType,
        status: progress.status,
        next_review: progress.next_review_at,
        review_count: progress.review_count,
        ease_factor: progress.ease_factor,
      })
    }

    return NextResponse.json({
      data: {
        items,
        total: items.length,
      },
    })
  } catch (error) {
    console.error('[review GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 提交复习结果
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { cardId, cardType, quality, videoId } = body as {
      cardId: string
      cardType: CardType
      quality: number  // 0=忘记, 2=一般, 5=简单 (SM-2 标准)
      videoId?: string
    }

    if (!cardId || !cardType || quality === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 获取当前进度
    const { data: current, error: fetchError } = await supabase
      .from('user_card_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('card_id', cardId)
      .eq('card_type', cardType)
      .maybeSingle()

    // 如果没有进度记录，需要先获取 video_id 并创建
    if (!current) {
      // 如果没有传入 videoId，从卡片表获取
      let actualVideoId = videoId
      if (!actualVideoId) {
        const tableName = CARD_TABLES[cardType]
        const { data: cardData } = await supabase
          .from(tableName)
          .select('video_id')
          .eq('id', cardId)
          .single()

        if (!cardData) {
          return NextResponse.json(
            { error: 'Card not found' },
            { status: 404 }
          )
        }
        actualVideoId = cardData.video_id
      }

      // 创建初始进度记录
      const { error: insertError } = await supabase
        .from('user_card_progress')
        .insert({
          user_id: user.id,
          card_id: cardId,
          card_type: cardType,
          video_id: actualVideoId,
          status: 'unknown',  // 数据库约束只允许: known, unknown, learning
          review_count: 0,
          ease_factor: 2.5,
          next_review_at: null,
        })

      if (insertError) {
        console.error('[review POST] Insert error:', insertError)
        return NextResponse.json(
          { error: 'Failed to create progress record' },
          { status: 500 }
        )
      }
    }

    // 重新获取进度记录（确保存在）
    const { data: progress, error: refetchError } = await supabase
      .from('user_card_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('card_id', cardId)
      .eq('card_type', cardType)
      .single()

    if (refetchError || !progress) {
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      )
    }

    // SM-2 算法计算下次复习时间
    // quality: 0=忘记, 2=一般, 5=简单
    let newEaseFactor = progress.ease_factor
    let interval = 1
    const reviewCount = progress.review_count || 0

    if (quality >= 5) {
      // 简单/已知
      if (reviewCount === 0) {
        interval = 1
      } else if (reviewCount === 1) {
        interval = 6
      } else {
        interval = Math.round(reviewCount * progress.ease_factor)
      }
      // 更新 ease factor
      newEaseFactor = Math.max(1.3, progress.ease_factor + 0.1)
    } else if (quality >= 2) {
      // 一般/学习中
      interval = Math.max(1, Math.round(reviewCount * 0.5))
      newEaseFactor = Math.max(1.3, progress.ease_factor - 0.1)
    } else {
      // 忘记/未知
      interval = 1
      newEaseFactor = Math.max(1.3, progress.ease_factor - 0.2)
    }

    // 计算下次复习时间
    const nextReviewAt = new Date()
    nextReviewAt.setDate(nextReviewAt.getDate() + interval)

    // 确定状态
    let newStatus = 'learning'
    if (quality >= 5) newStatus = 'known'
    else if (quality === 0) newStatus = 'unknown'

    // 更新进度
    const { error: updateError } = await supabase
      .from('user_card_progress')
      .update({
        status: newStatus,
        review_count: reviewCount + 1,
        last_reviewed_at: new Date().toISOString(),
        next_review_at: nextReviewAt.toISOString(),
        ease_factor: newEaseFactor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', progress.id)

    if (updateError) {
      console.error('[review POST] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        next_review: nextReviewAt.toISOString(),
        interval_days: interval,
        ease_factor: newEaseFactor,
      },
    })
  } catch (error) {
    console.error('[review POST] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
