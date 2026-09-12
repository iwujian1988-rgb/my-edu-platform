/**
 * 小说词复习进度 API
 *
 * GET  /api/novel/[bookId]/progress → 用户本书全部进度行（Map 预载）
 * POST /api/novel/[bookId]/progress
 *   { action: 'review',  lemma, quality: 1|2|3 }  SM-2 调度（1=忘记/2=模糊/3=认识）
 *   { action: 'status',  lemma, status }          直接改状态（new/unknown/vague/known）
 *   { action: 'notebook', lemma, inNotebook }     生词本开关
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasNovelAccess } from '@/lib/novel-permissions'
import { scheduleSm2Review } from '@/lib/sm2-scheduler'
import { updateLearningCalendar } from '@/lib/learning-calendar'
import type { NovelWordStatus } from '@/types/database'

const VALID_STATUS = new Set(['new', 'unknown', 'vague', 'known'])
const STATUS_BY_QUALITY: Record<number, NovelWordStatus> = { 1: 'unknown', 2: 'vague', 3: 'known' }

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await hasNovelAccess(user.id, bookId))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('novel_word_progress')
      .select('lemma, status, in_notebook, next_review_at, repetition_count, easiness_factor, updated_at')
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    if (error) {
      console.error('[novel progress GET] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('[novel progress GET] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await hasNovelAccess(user.id, bookId))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action, lemma } = body as { action?: string; lemma?: string }

    if (!action || !lemma || typeof lemma !== 'string') {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    const admin = await createAdminClient()

    // 翻卡评分：SM-2 调度
    if (action === 'review') {
      const quality = Number(body.quality)
      if (![1, 2, 3].includes(quality)) {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 })
      }

      const { data: current } = await admin
        .from('novel_word_progress')
        .select('id, repetition_count, easiness_factor')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('lemma', lemma)
        .maybeSingle()

      const repetitionCount = current?.repetition_count || 0
      const easeFactor = Number(current?.easiness_factor ?? 2.5)

      const { intervalDays, easeFactor: newEaseFactor, nextReviewAt } =
        scheduleSm2Review({ easeFactor, reviewCount: repetitionCount, quality })

      const { error } = await admin
        .from('novel_word_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          lemma,
          status: STATUS_BY_QUALITY[quality],
          repetition_count: repetitionCount + 1,
          easiness_factor: newEaseFactor,
          next_review_at: nextReviewAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,book_id,lemma' })

      if (error) {
        console.error('[novel progress POST review] Error:', error)
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
      }

      // 学习日历：只进通用 cards_reviewed 计数（cardType 'novel' 不命中 video 分项）
      updateLearningCalendar(admin, user.id, { cardType: 'novel' })
        .then((r) => { if (!r.success) console.error('[novel progress] Calendar update failed:', r.error) })

      return NextResponse.json({
        success: true,
        data: { next_review: nextReviewAt, interval_days: intervalDays, ease_factor: newEaseFactor },
      })
    }

    // 直接改状态
    if (action === 'status') {
      const status = String(body.status) as NovelWordStatus
      if (!VALID_STATUS.has(status)) {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 })
      }

      const { error } = await admin
        .from('novel_word_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          lemma,
          status,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,book_id,lemma' })

      if (error) {
        console.error('[novel progress POST status] Error:', error)
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // 生词本开关（部分 upsert：不覆盖已有 status/调度字段）
    if (action === 'notebook') {
      const inNotebook = Boolean(body.inNotebook)

      const { error } = await admin
        .from('novel_word_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          lemma,
          in_notebook: inNotebook,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,book_id,lemma' })

      if (error) {
        console.error('[novel progress POST notebook] Error:', error)
        return NextResponse.json({ error: 'Failed to update notebook' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  } catch (error) {
    console.error('[novel progress POST] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
