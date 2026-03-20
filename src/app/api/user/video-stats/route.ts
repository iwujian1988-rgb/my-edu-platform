/**
 * 用户视频学习统计 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 获取用户进度统计
  const { data: progressData } = await supabase
    .from('user_video_progress')
    .select('video_id, is_completed, watch_duration')
    .eq('user_id', user.id)

  // 获取卡片进度统计
  const { data: cardProgress } = await supabase
    .from('user_card_progress')
    .select('card_type, status')
    .eq('user_id', user.id)

  // 获取最近7天活动
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: recentActivity } = await supabase
    .from('video_learning_calendar')
    .select('*')
    .eq('user_id', user.id)
    .gte('learning_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('learning_date', { ascending: true })

  // 计算统计数据
  const totalVideos = progressData?.length || 0
  const completedVideos = progressData?.filter((p) => p.is_completed).length || 0
  const totalDuration = progressData?.reduce((sum, p) => sum + (p.watch_duration || 0), 0) || 0

  const totalCards = cardProgress?.length || 0
  const knownCards = cardProgress?.filter((c) => c.status === 'known').length || 0
  const learningCards = cardProgress?.filter((c) => c.status === 'learning').length || 0

  // 按卡片类型统计
  const wordsStats = {
    total: cardProgress?.filter((c) => c.card_type === 'word').length || 0,
    known: cardProgress?.filter((c) => c.card_type === 'word' && c.status === 'known').length || 0,
  }
  const phrasesStats = {
    total: cardProgress?.filter((c) => c.card_type === 'phrase').length || 0,
    known: cardProgress?.filter((c) => c.card_type === 'phrase' && c.status === 'known').length || 0,
  }
  const expressionsStats = {
    total: cardProgress?.filter((c) => c.card_type === 'expression').length || 0,
    known: cardProgress?.filter((c) => c.card_type === 'expression' && c.status === 'known').length || 0,
  }

  // 填充最近7天数据
  const last7Days = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const dayActivity = recentActivity?.find((a) => a.learning_date === dateStr)

    last7Days.push({
      date: dateStr,
      videos_watched: dayActivity?.video_count || 0,
      cards_reviewed: dayActivity?.cards_reviewed || 0,
      duration_seconds: dayActivity?.total_minutes * 60 || 0,
    })
  }

  return NextResponse.json({
    data: {
      overview: {
        total_videos: totalVideos,
        completed_videos: completedVideos,
        total_duration_seconds: totalDuration,
        watched_duration_seconds: totalDuration,
        total_cards: totalCards,
        known_cards: knownCards,
        learning_cards: learningCards,
        current_streak: 0,
        longest_streak: 0,
      },
      by_language: {},
      by_card_type: {
        words: wordsStats,
        phrases: phrasesStats,
        expressions: expressionsStats,
      },
      recent_activity: last7Days,
      weekly_goal: {
        target: 7,
        current: completedVideos,
        unit: 'videos' as const,
      },
    },
  })
}
