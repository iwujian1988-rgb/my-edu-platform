'use client'

/**
 * 视频学习统计页 - 客户端组件
 *
 * 展示用户的学习统计数据
 */

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  Clock,
  BookOpen,
  MessageSquare,
  Sparkles,
  CheckCircle,
  Target,
  Flame,
  Calendar,
  ChevronRight,
  Mic,
} from 'lucide-react'
import Link from 'next/link'
import type { VideoLanguage } from '@/types/video'
import { VIDEO_LANGUAGE_LABELS } from '@/types/video'

// 统计数据类型
interface VideoStatsData {
  overview: {
    total_videos: number
    completed_videos: number
    total_duration_seconds: number
    watched_duration_seconds: number
    total_cards: number
    known_cards: number
    learning_cards: number
    current_streak: number
    longest_streak: number
    recording_count: number
  }
  by_language: Record<
    VideoLanguage,
    {
      total_videos: number
      completed_videos: number
      total_cards: number
      known_cards: number
    }
  >
  by_card_type: {
    words: { total: number; known: number }
    phrases: { total: number; known: number }
    expressions: { total: number; known: number }
  }
  recent_activity: Array<{
    date: string
    videos_watched: number
    cards_reviewed: number
    duration_seconds: number
  }>
  weekly_goal: {
    target: number
    current: number
    unit: 'videos' | 'minutes' | 'cards'
  }
}

// SWR fetcher
const fetcher = async (url: string): Promise<VideoStatsData> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  const json = await res.json()
  return json.data
}

// 格式化时长
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

// 统计卡片组件
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subValue?: string
  color: string
}) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('w-5 h-5', color)} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && (
        <div className="text-sm text-muted-foreground mt-1">{subValue}</div>
      )}
    </div>
  )
}

// 月度日历组件
const DAYS_IN_WEEK = 7
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function MonthlyCalendar({
  recentActivity,
}: {
  recentActivity: VideoStatsData['recent_activity']
}) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  // 获取当月第一天是星期几
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  // 获取当月天数
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // 创建活动日期集合
  const activityDates = new Set(
    recentActivity
      .filter((day) => day.videos_watched > 0 || day.cards_reviewed > 0)
      .map((day) => day.date.split('T')[0])
  )

  // 生成日历格子
  const calendarDays: Array<{ date: number | null; hasActivity: boolean; isToday: boolean }> = []

  // 添加月初空白格子
  for (let index = 0; index < firstDayOfMonth; index++) {
    calendarDays.push({ date: null, hasActivity: false, isToday: false })
  }

  // 添加日期格子
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    calendarDays.push({
      date: day,
      hasActivity: activityDates.has(dateStr),
      isToday: day === today.getDate(),
    })
  }

  return (
    <div className="space-y-2">
      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="text-center text-xs text-muted-foreground py-1">
            {weekday}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={cn(
              'aspect-square flex items-center justify-center text-sm rounded',
              day.date === null && 'invisible',
              day.isToday && 'ring-2 ring-primary',
              day.hasActivity && 'bg-primary/20 text-primary font-medium',
              !day.hasActivity && day.date !== null && 'text-muted-foreground'
            )}
          >
            {day.date}
          </div>
        ))}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary/20" />
          <span>有学习</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted" />
          <span>无活动</span>
        </div>
      </div>
    </div>
  )
}

export function VideoStatsClient() {
  const { data, error, isLoading } = useSWR<VideoStatsData>(
    '/api/user/video-stats',
    fetcher
  )

  // 加载状态
  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  // 错误状态
  if (error || !data) {
    return (
      <div className="container py-6">
        <div className="text-center py-16">
          <p className="text-muted-foreground">加载失败</p>
          <Button variant="outline" className="mt-4">
            重试
          </Button>
        </div>
      </div>
    )
  }

  const { overview, by_language, by_card_type, recent_activity, weekly_goal } =
    data

  // 计算完成率
  const videoCompletionRate =
    overview.total_videos > 0
      ? Math.round((overview.completed_videos / overview.total_videos) * 100)
      : 0

  const cardMasteryRate =
    overview.total_cards > 0
      ? Math.round((overview.known_cards / overview.total_cards) * 100)
      : 0

  const weeklyProgress =
    weekly_goal.target > 0
      ? Math.round((weekly_goal.current / weekly_goal.target) * 100)
      : 0

  return (
    <div className="container py-6 space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold">学习统计</h1>
        <p className="text-muted-foreground mt-1">你的视频学习进度一览</p>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={CheckCircle}
          label="已完成视频"
          value={overview.completed_videos}
          subValue={`共 ${overview.total_videos} 个`}
          color="text-green-500"
        />
        <StatCard
          icon={Clock}
          label="学习时长"
          value={formatDuration(overview.watched_duration_seconds)}
          subValue={`共 ${formatDuration(overview.total_duration_seconds)}`}
          color="text-blue-500"
        />
        <StatCard
          icon={Target}
          label="卡片掌握率"
          value={`${cardMasteryRate}%`}
          subValue={`${overview.known_cards}/${overview.total_cards} 个`}
          color="text-purple-500"
        />
        <StatCard
          icon={Mic}
          label="录音练习"
          value={overview.recording_count}
          subValue="次"
          color="text-pink-500"
        />
        <StatCard
          icon={Flame}
          label="连续学习"
          value={`${overview.current_streak} 天`}
          subValue={`最长 ${overview.longest_streak} 天`}
          color="text-orange-500"
        />
      </div>

      {/* 周目标进度 */}
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="font-medium">本周目标</span>
          </div>
          <Badge variant={weeklyProgress >= 100 ? 'default' : 'secondary'}>
            {weekly_goal.current} / {weekly_goal.target}{' '}
            {weekly_goal.unit === 'videos'
              ? '个视频'
              : weekly_goal.unit === 'minutes'
                ? '分钟'
                : '张卡片'}
          </Badge>
        </div>
        <Progress value={Math.min(weeklyProgress, 100)} className="h-2" />
        {weeklyProgress >= 100 && (
          <p className="text-sm text-green-500 mt-2">
            🎉 恭喜完成本周目标！
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 按语言统计 */}
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            按语言统计
          </h3>
          <div className="space-y-3">
            {Object.entries(by_language).map(([lang, stats]) => {
              if (stats.total_videos === 0) return null
              const completionRate =
                stats.total_videos > 0
                  ? Math.round(
                      (stats.completed_videos / stats.total_videos) * 100
                    )
                  : 0
              const masteryRate =
                stats.total_cards > 0
                  ? Math.round((stats.known_cards / stats.total_cards) * 100)
                  : 0

              return (
                <div key={lang} className="p-3 rounded bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      {VIDEO_LANGUAGE_LABELS[lang as VideoLanguage]}
                    </span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{stats.completed_videos}/{stats.total_videos} 视频</span>
                      <span>·</span>
                      <span>{stats.known_cards}/{stats.total_cards} 卡片</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        视频完成率
                      </div>
                      <Progress value={completionRate} className="h-1.5" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        卡片掌握率
                      </div>
                      <Progress value={masteryRate} className="h-1.5" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 按卡片类型统计 */}
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            按卡片类型统计
          </h3>
          <div className="space-y-4">
            {/* 词汇 */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">词汇</span>
                  <span className="text-sm text-muted-foreground">
                    {by_card_type.words.known}/{by_card_type.words.total}
                  </span>
                </div>
                <Progress
                  value={
                    by_card_type.words.total > 0
                      ? (by_card_type.words.known / by_card_type.words.total) *
                        100
                      : 0
                  }
                  className="h-2"
                />
              </div>
            </div>

            {/* 短语 */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">短语</span>
                  <span className="text-sm text-muted-foreground">
                    {by_card_type.phrases.known}/{by_card_type.phrases.total}
                  </span>
                </div>
                <Progress
                  value={
                    by_card_type.phrases.total > 0
                      ? (by_card_type.phrases.known /
                          by_card_type.phrases.total) *
                        100
                      : 0
                  }
                  className="h-2"
                />
              </div>
            </div>

            {/* 惯用语 */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">惯用语</span>
                  <span className="text-sm text-muted-foreground">
                    {by_card_type.expressions.known}/
                    {by_card_type.expressions.total}
                  </span>
                </div>
                <Progress
                  value={
                    by_card_type.expressions.total > 0
                      ? (by_card_type.expressions.known /
                          by_card_type.expressions.total) *
                        100
                      : 0
                  }
                  className="h-2"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 学习日历 */}
      <div className="p-4 rounded-lg border bg-card">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          本月学习日历
        </h3>
        <MonthlyCalendar recentActivity={recent_activity} />
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/videos"
          className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow flex items-center justify-between group"
        >
          <div>
            <h4 className="font-medium">继续学习</h4>
            <p className="text-sm text-muted-foreground">浏览更多视频</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
        <Link
          href="/video-flashcards"
          className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow flex items-center justify-between group"
        >
          <div>
            <h4 className="font-medium">卡片复习</h4>
            <p className="text-sm text-muted-foreground">间隔重复复习</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
        <Link
          href="/video-favorites"
          className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow flex items-center justify-between group"
        >
          <div>
            <h4 className="font-medium">我的收藏</h4>
            <p className="text-sm text-muted-foreground">查看收藏视频</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </div>
    </div>
  )
}
