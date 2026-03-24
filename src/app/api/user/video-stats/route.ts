/**
 * 用户视频学习统计 API
 *
 * 返回用户的学习统计数据：
 * - 视频完成情况
 * - 卡片掌握情况
 * - 学习日历数据
 * - 按语言/类型分类的统计
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { VideoLanguage } from '@/types/video'

// 支持的语言列表
const SUPPORTED_LANGUAGES: VideoLanguage[] = ['en', 'fr', 'de', 'es', 'ja', 'it', 'ru']

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // 1. 获取视频进度统计
    const { data: videoProgress } = await supabase
      .from('user_video_progress')
      .select('video_id, max_progress, is_completed, watch_duration')
      .eq('user_id', userId)

    // 获取有权限的视频 ID 列表
    const { data: accessibleVideos } = await supabase
      .from('videos')
      .select('id, language, duration')

    const accessibleVideoIds = new Set(accessibleVideos?.map(v => v.id) || [])
    const videoLanguageMap = new Map(
      accessibleVideos?.map(v => [v.id, v.language]) || []
    )
    const videoDurationMap = new Map(
      accessibleVideos?.map(v => [v.id, v.duration]) || []
    )

    // 计算视频统计
    const totalVideos = accessibleVideoIds.size
    const completedVideos = videoProgress?.filter(p =>
      accessibleVideoIds.has(p.video_id) && p.is_completed
    ).length || 0

    // 计算总观看时长
    const watchedDurationSeconds = videoProgress?.reduce((sum, p) => {
      if (accessibleVideoIds.has(p.video_id)) {
        return sum + (p.watch_duration || 0)
      }
      return sum
    }, 0) || 0

    const totalDurationSeconds = Array.from(accessibleVideoIds).reduce((sum, videoId) => {
      return sum + (videoDurationMap.get(videoId) || 0)
    }, 0)

    // 2. 获取卡片进度统计
    const { data: cardProgress } = await supabase
      .from('user_card_progress')
      .select('card_type, status, video_id')
      .eq('user_id', userId)

    // 只统计有权限视频的卡片
    const validCardProgress = cardProgress?.filter(p => accessibleVideoIds.has(p.video_id)) || []

    const totalCards = validCardProgress.length
    const knownCards = validCardProgress.filter(p => p.status === 'known').length
    const learningCards = validCardProgress.filter(p => p.status === 'learning').length

    // 按卡片类型统计
    const byCardType = {
      words: {
        total: validCardProgress.filter(p => p.card_type === 'word').length,
        known: validCardProgress.filter(p => p.card_type === 'word' && p.status === 'known').length,
      },
      phrases: {
        total: validCardProgress.filter(p => p.card_type === 'phrase').length,
        known: validCardProgress.filter(p => p.card_type === 'phrase' && p.status === 'known').length,
      },
      expressions: {
        total: validCardProgress.filter(p => p.card_type === 'expression').length,
        known: validCardProgress.filter(p => p.card_type === 'expression' && p.status === 'known').length,
      },
    }

    // 3. 按语言统计
    const byLanguage: Record<VideoLanguage, { total_videos: number; completed_videos: number; total_cards: number; known_cards: number }> =
      {} as Record<VideoLanguage, { total_videos: number; completed_videos: number; total_cards: number; known_cards: number }>

    for (const lang of SUPPORTED_LANGUAGES) {
      byLanguage[lang] = { total_videos: 0, completed_videos: 0, total_cards: 0, known_cards: 0 }
    }

    // 统计每个语言的视频
    for (const video of accessibleVideos || []) {
      const lang = video.language as VideoLanguage
      if (byLanguage[lang]) {
        byLanguage[lang].total_videos++

        const progress = videoProgress?.find(p => p.video_id === video.id)
        if (progress?.is_completed) {
          byLanguage[lang].completed_videos++
        }
      }
    }

    // 统计每个语言的卡片
    for (const card of validCardProgress) {
      const lang = videoLanguageMap.get(card.video_id) as VideoLanguage
      if (lang && byLanguage[lang]) {
        byLanguage[lang].total_cards++
        if (card.status === 'known') {
          byLanguage[lang].known_cards++
        }
      }
    }

    // 4. 获取学习日历数据（最近30天）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const { data: calendarData } = await supabase
      .from('video_learning_calendar')
      .select('*')
      .eq('user_id', userId)
      .gte('learning_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('learning_date', { ascending: true })

    // 填充最近7天数据（用于日历显示）
    const recentActivity = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayActivity = calendarData?.find(c => c.learning_date === dateStr)

      recentActivity.push({
        date: dateStr,
        videos_watched: dayActivity?.video_count || 0,
        cards_reviewed: dayActivity?.cards_reviewed || 0,
        duration_seconds: (dayActivity?.total_minutes || 0) * 60,
      })
    }

    // 5. 计算连续学习天数
    let currentStreak = 0
    let longestStreak = 0

    if (calendarData && calendarData.length > 0) {
      // 按日期排序
      const sortedDays = [...calendarData].sort((a, b) =>
        new Date(b.learning_date).getTime() - new Date(a.learning_date).getTime()
      )

      // 计算当前连续天数
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 0; i < sortedDays.length; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const dateStr = checkDate.toISOString().split('T')[0]

        const dayActivity = sortedDays.find(d => d.learning_date === dateStr)
        if (dayActivity && (dayActivity.video_count > 0 || dayActivity.cards_reviewed > 0)) {
          currentStreak++
        } else if (i === 0) {
          // 今天还没有活动，检查昨天
          continue
        } else {
          break
        }
      }

      // 计算最长连续天数（简化计算）
      let tempStreak = 0
      let lastDate: Date | null = null

      for (const day of [...sortedDays].reverse()) {
        if (day.video_count > 0 || day.cards_reviewed > 0) {
          const currentDate = new Date(day.learning_date)
          if (lastDate) {
            const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
            if (diffDays === 1) {
              tempStreak++
            } else {
              tempStreak = 1
            }
          } else {
            tempStreak = 1
          }
          longestStreak = Math.max(longestStreak, tempStreak)
          lastDate = currentDate
        }
      }
    }

    // 6. 获取录音数量
    const { count: recordingCount } = await supabase
      .from('user_recordings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // 7. 计算周目标进度
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // 本周日开始
    weekStart.setHours(0, 0, 0, 0)

    const { data: weekData } = await supabase
      .from('video_learning_calendar')
      .select('video_count')
      .eq('user_id', userId)
      .gte('learning_date', weekStart.toISOString().split('T')[0])

    const weeklyVideoCount = weekData?.reduce((sum, d) => sum + (d.video_count || 0), 0) || 0

    return NextResponse.json({
      data: {
        overview: {
          total_videos: totalVideos,
          completed_videos: completedVideos,
          total_duration_seconds: totalDurationSeconds,
          watched_duration_seconds: watchedDurationSeconds,
          total_cards: totalCards,
          known_cards: knownCards,
          learning_cards: learningCards,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          recording_count: recordingCount || 0,
        },
        by_language: byLanguage,
        by_card_type: byCardType,
        recent_activity: recentActivity,
        weekly_goal: {
          target: 7,
          current: weeklyVideoCount,
          unit: 'videos' as const,
        },
      },
    })
  } catch (error) {
    console.error('[video-stats] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
