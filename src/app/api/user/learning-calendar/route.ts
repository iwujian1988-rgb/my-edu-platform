/**
 * 学习日历 API
 *
 * GET: 获取指定月份的学习日历数据
 * POST: 更新当日学习统计（内部调用或学习完成时调用）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CardType } from '@/types/video'

// 数据库记录类型
interface CalendarRecord {
  id: string
  user_id: string
  learning_date: string
  video_count: number
  total_minutes: number
  cards_reviewed: number
  recordings_count: number
  words_marked: number
  phrases_marked: number
  expressions_marked: number
  video_ids: string[]
  created_at: string
}

// 学习日历日期详情
interface CalendarDayDetail {
  date: string
  video_count: number
  words_marked: number
  phrases_marked: number
  expressions_marked: number
  total_minutes: number
  video_ids: string[]
}

// 月度统计
interface MonthStats {
  total_videos: number
  total_words: number
  total_phrases: number
  total_expressions: number
  total_minutes: number
  active_days: number
}

// GET: 获取指定月份的学习日历
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month')

    // 默认当前月份
    const now = new Date()
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear()
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1

    // 计算月份范围
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // 月末

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // 查询该月的学习记录 - 使用 any 绕过类型检查
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: calendarData, error } = await (supabase as any)
      .from('video_learning_calendar')
      .select('*')
      .eq('user_id', user.id)
      .gte('learning_date', startDateStr)
      .lte('learning_date', endDateStr)
      .order('learning_date', { ascending: true })

    if (error) {
      console.error('[learning-calendar GET] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 构建每日数据
    const daysInMonth = endDate.getDate()
    const days: CalendarDayDetail[] = []

    // 创建日期到数据的映射
    const dataMap = new Map<string, CalendarRecord>()
    for (const item of (calendarData || []) as CalendarRecord[]) {
      dataMap.set(item.learning_date, item)
    }

    // 填充每一天的数据
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayData = dataMap.get(dateStr)

      days.push({
        date: dateStr,
        video_count: dayData?.video_count || 0,
        words_marked: dayData?.words_marked || 0,
        phrases_marked: dayData?.phrases_marked || 0,
        expressions_marked: dayData?.expressions_marked || 0,
        total_minutes: dayData?.total_minutes || 0,
        video_ids: dayData?.video_ids || [],
      })
    }

    // 计算月度统计
    const stats: MonthStats = {
      total_videos: 0,
      total_words: 0,
      total_phrases: 0,
      total_expressions: 0,
      total_minutes: 0,
      active_days: 0,
    }

    for (const day of days) {
      if (day.video_count > 0 || day.words_marked > 0 || day.phrases_marked > 0 || day.expressions_marked > 0) {
        stats.active_days++
      }
      stats.total_videos += day.video_count
      stats.total_words += day.words_marked
      stats.total_phrases += day.phrases_marked
      stats.total_expressions += day.expressions_marked
      stats.total_minutes += day.total_minutes
    }

    return NextResponse.json({
      data: {
        year,
        month,
        days,
        stats,
      },
    })
  } catch (error) {
    console.error('[learning-calendar GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: 更新当日学习统计
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { videoId, cardType, durationMinutes } = body as {
      videoId?: string
      cardType?: CardType
      durationMinutes?: number
    }

    // 获取今日日期
    const today = new Date().toISOString().split('T')[0]

    // 获取现有记录 - 使用 any 绕过类型检查
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('video_learning_calendar')
      .select('*')
      .eq('user_id', user.id)
      .eq('learning_date', today)
      .maybeSingle()

    if (fetchError) {
      console.error('[learning-calendar POST] Fetch error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const existingRecord = existing as CalendarRecord | null

    // 构建更新数据
    const updateData: Record<string, unknown> = {}

    if (videoId) {
      const currentVideoIds: string[] = existingRecord?.video_ids || []
      if (!currentVideoIds.includes(videoId)) {
        updateData.video_ids = [...currentVideoIds, videoId]
        updateData.video_count = (existingRecord?.video_count || 0) + 1
      }
    }

    if (cardType) {
      switch (cardType) {
        case 'word':
          updateData.words_marked = (existingRecord?.words_marked || 0) + 1
          break
        case 'phrase':
          updateData.phrases_marked = (existingRecord?.phrases_marked || 0) + 1
          break
        case 'expression':
          updateData.expressions_marked = (existingRecord?.expressions_marked || 0) + 1
          break
      }
      // 兼容旧字段
      updateData.cards_reviewed = (existingRecord?.cards_reviewed || 0) + 1
    }

    if (durationMinutes && durationMinutes > 0) {
      updateData.total_minutes = (existingRecord?.total_minutes || 0) + durationMinutes
    }

    // 如果没有需要更新的字段，直接返回
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, message: 'No updates needed' })
    }

    // 使用 any 绕过类型检查
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any

    let error
    if (existingRecord) {
      // 更新现有记录
      const result = await supabaseAny
        .from('video_learning_calendar')
        .update(updateData)
        .eq('id', existingRecord.id)
      error = result.error
    } else {
      // 创建新记录
      const result = await supabaseAny
        .from('video_learning_calendar')
        .insert({
          user_id: user.id,
          learning_date: today,
          video_count: (updateData.video_count as number) || 0,
          video_ids: (updateData.video_ids as string[]) || [],
          words_marked: (updateData.words_marked as number) || 0,
          phrases_marked: (updateData.phrases_marked as number) || 0,
          expressions_marked: (updateData.expressions_marked as number) || 0,
          cards_reviewed: (updateData.cards_reviewed as number) || 0,
          total_minutes: (updateData.total_minutes as number) || 0,
        })
      error = result.error
    }

    if (error) {
      console.error('[learning-calendar POST] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[learning-calendar POST] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
