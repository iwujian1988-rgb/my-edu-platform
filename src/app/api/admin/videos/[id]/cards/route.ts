/**
 * 管理端 - 视频卡片管理 API
 *
 * GET: 获取视频所有卡片（含审核状态）
 * PATCH: 批量更新卡片审核状态
 * DELETE: 删除卡片
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md Section 5.11
 */

import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

type CardType = 'word' | 'phrase' | 'expression' | 'exercise'

interface CardItem {
  id: string
  type: CardType
  content: string // word / phrase / expression / original_text (for exercise)
  chinese_definition: string
  phonetic?: string
  part_of_speech?: string
  example_from_video?: string
  example_translation?: string
  context?: string
  context_translation?: string
  formula?: string
  meaning?: string
  usage_note?: string
  difficulty_level: number
  is_reviewed: boolean
  reviewed_at?: string
  created_at: string
  // 填空练习特有字段
  exercise_type?: string
  blank_positions?: Array<{ start: number; end: number; word: string; hint?: string }>
  hint_type?: string
  answer_text?: string
}

interface BatchUpdateRequest {
  updates: Array<{
    id: string
    type: CardType
    is_reviewed: boolean
  }>
}

/**
 * GET: 获取视频所有卡片
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    // 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权' },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient()

    // 并行获取四种卡片（包括填空练习）
    const [
      { data: wordCards, error: wordError },
      { data: phraseCards, error: phraseError },
      { data: expressionCards, error: expressionError },
      { data: exerciseCards, error: exerciseError },
    ] = await Promise.all([
      supabase
        .from('video_word_cards')
        .select('*')
        .eq('video_id', videoId)
        .order('display_order', { ascending: true }) as any,
      supabase
        .from('video_phrase_cards')
        .select('*')
        .eq('video_id', videoId)
        .order('display_order', { ascending: true }) as any,
      supabase
        .from('video_expression_cards')
        .select('*')
        .eq('video_id', videoId)
        .order('display_order', { ascending: true }) as any,
      supabase
        .from('video_exercises')
        .select('*')
        .eq('video_id', videoId)
        .order('display_order', { ascending: true }) as any,
    ])

    if (wordError || phraseError || expressionError || exerciseError) {
      console.error('[卡片管理] 查询错误:', { wordError, phraseError, expressionError, exerciseError })
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    // 统一格式化
    const formatCards = (
      cards: any[],
      type: CardType,
      contentField: string
    ): CardItem[] => {
      return (cards || []).map(card => ({
        id: card.id,
        type,
        content: card[contentField],
        chinese_definition: card.chinese_definition,
        phonetic: card.phonetic,
        part_of_speech: card.part_of_speech,
        example_from_video: card.example_from_video,
        example_translation: card.example_translation,
        context: card.context,
        context_translation: card.context_translation,
        formula: card.formula,
        meaning: card.meaning,
        usage_note: card.usage_note,
        difficulty_level: card.difficulty_level,
        is_reviewed: card.is_reviewed ?? false,
        reviewed_at: card.reviewed_at,
        created_at: card.created_at,
      }))
    }

    // 格式化填空练习（特殊处理）
    const formatExercises = (cards: any[]): CardItem[] => {
      return (cards || []).map(card => ({
        id: card.id,
        type: 'exercise' as CardType,
        content: card.original_text || '',
        chinese_definition: '', // 填空练习没有翻译字段
        difficulty_level: card.difficulty_level || 1,
        is_reviewed: card.is_reviewed ?? false,
        reviewed_at: card.reviewed_at,
        created_at: card.created_at,
        // 填空练习特有字段
        exercise_type: card.exercise_type,
        blank_positions: card.blank_positions,
        hint_type: card.hint_type,
        answer_text: card.answer_text,
      }))
    }

    const allCards: CardItem[] = [
      ...formatCards(wordCards, 'word', 'word'),
      ...formatCards(phraseCards, 'phrase', 'phrase'),
      ...formatCards(expressionCards, 'expression', 'expression'),
      ...formatExercises(exerciseCards),
    ]

    // 统计
    const stats = {
      total: allCards.length,
      reviewed: allCards.filter(c => c.is_reviewed).length,
      pending: allCards.filter(c => !c.is_reviewed).length,
      by_type: {
        word: { total: wordCards?.length || 0, pending: (wordCards || []).filter(c => !c.is_reviewed).length },
        phrase: { total: phraseCards?.length || 0, pending: (phraseCards || []).filter(c => !c.is_reviewed).length },
        expression: { total: expressionCards?.length || 0, pending: (expressionCards || []).filter(c => !c.is_reviewed).length },
        exercise: { total: exerciseCards?.length || 0, pending: (exerciseCards || []).filter(c => !c.is_reviewed).length },
      },
    }

    return NextResponse.json({
      success: true,
      data: {
        cards: allCards,
        stats,
      },
    })
  } catch (error) {
    console.error('[卡片管理] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * PATCH: 批量更新审核状态
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    const body: BatchUpdateRequest = await request.json()
    // 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权' },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient()

    if (!body.updates || !Array.isArray(body.updates) || body.updates.length === 0) {
      return NextResponse.json({ error: '缺少更新数据' }, { status: 400 })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    // 按类型分组
    const byType: Record<CardType, Array<{ id: string; is_reviewed: boolean }>> = {
      word: [],
      phrase: [],
      expression: [],
    }

    for (const update of body.updates) {
      if (update.type && byType[update.type]) {
        byType[update.type].push({ id: update.id, is_reviewed: update.is_reviewed })
      }
    }

    const now = new Date().toISOString()

    // 批量更新每种类型
    for (const [type, items] of Object.entries(byType)) {
      if (items.length === 0) continue

      const tableName = type === 'word' ? 'video_word_cards'
        : type === 'phrase' ? 'video_phrase_cards'
        : 'video_expression_cards'

      for (const item of items) {
        const { error } = await (supabase as any)
          .from(tableName)
          .update({
            is_reviewed: item.is_reviewed,
            reviewed_at: item.is_reviewed ? now : null,
            reviewed_by: item.is_reviewed ? adminCheck.admin!.user_id : null,
          })
          .eq('id', item.id)
          .eq('video_id', videoId)

        if (error) {
          results.failed++
          results.errors.push(`${type}/${item.id}: ${error.message}`)
        } else {
          results.success++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功更新 ${results.success} 张卡片`,
      data: results,
    })
  } catch (error) {
    console.error('[卡片管理] 更新错误:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE: 删除卡片
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    const { searchParams } = new URL(request.url)
    const cardId = searchParams.get('cardId')
    const cardType = searchParams.get('cardType') as CardType | null

    if (!cardId || !cardType) {
      return NextResponse.json({ error: '缺少卡片ID或类型' }, { status: 400 })
    }

    const validTypes: CardType[] = ['word', 'phrase', 'expression']
    if (!validTypes.includes(cardType)) {
      return NextResponse.json({ error: '无效的卡片类型' }, { status: 400 })
    }

    // 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权' },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient()

    const tableName = cardType === 'word' ? 'video_word_cards'
      : cardType === 'phrase' ? 'video_phrase_cards'
      : 'video_expression_cards'

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', cardId)
      .eq('video_id', videoId)

    if (error) {
      return NextResponse.json({ error: '删除失败', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '卡片已删除',
    })
  } catch (error) {
    console.error('[卡片管理] 删除错误:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
