'use client'

/**
 * 学习日历组件
 *
 * 功能：
 * - 月视图日历
 * - 颜色深浅表示学习强度
 * - 点击显示详情弹窗
 * - 当月统计数据
 * - 移动端适配
 *
 * 性能优化：使用 SWR 缓存，避免重复请求
 */

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import { ChevronLeft, ChevronRight, X, Video, BookOpen, MessageSquare, Sparkles } from 'lucide-react'

// 类型定义
interface CalendarDay {
  date: string
  video_count: number
  words_marked: number
  phrases_marked: number
  expressions_marked: number
  total_minutes: number
  video_ids: string[]
}

interface MonthStats {
  total_videos: number
  total_words: number
  total_phrases: number
  total_expressions: number
  total_minutes: number
  active_days: number
}

interface CalendarResponse {
  year: number
  month: number
  days: CalendarDay[]
  stats: MonthStats
}

// 星期标签
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

// 获取学习强度颜色
const getIntensityColor = (day: CalendarDay): string => {
  const total = day.video_count + day.words_marked + day.phrases_marked + day.expressions_marked
  if (total === 0) return 'bg-[#f3f5fb] dark:bg-[#202941]'
  if (total <= 3) return 'bg-[#edf0ff] dark:bg-[#24305a]'
  if (total <= 6) return 'bg-[#dce3ff] dark:bg-[#2a3a72]'
  if (total <= 10) return 'bg-[#c6d0ff] dark:bg-[#34478b]'
  return 'bg-[#7f8cff] dark:bg-[#6574ff]'
}

// 获取强度边框颜色
const getIntensityBorder = (day: CalendarDay): string => {
  const total = day.video_count + day.words_marked + day.phrases_marked + day.expressions_marked
  if (total === 0) return 'border-[#e7eaf2] dark:border-[#273149]'
  return 'border-[#cbd3ff] dark:border-[#5363d6]'
}

// 详情弹窗组件
function DayDetailModal({
  day,
  onClose
}: {
  day: CalendarDay
  onClose: () => void
}) {
  const date = new Date(day.date)
  const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  const hasActivity = day.video_count > 0 || day.words_marked > 0 || day.phrases_marked > 0 || day.expressions_marked > 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-[14px] border border-[#e7eaf2] bg-white shadow-[0_18px_48px_rgba(31,42,104,0.18)] dark:border-[#273149] dark:bg-[#141b2d]"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-[#e7eaf2] p-4 dark:border-[#273149]">
          <h3 className="font-black text-lg text-black dark:text-white">{dateStr}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#f3f5fb] transition-colors hover:bg-[#e9ecf4] dark:bg-[#202941] dark:hover:bg-[#26304b]"
          >
            <X className="w-4 h-4 text-black dark:text-white" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4">
          {hasActivity ? (
            <div className="space-y-3">
              {day.video_count > 0 && (
                <div className="flex items-center gap-3 rounded-[10px] border border-[#e7eaf2] bg-[#f8faff] p-3 dark:border-[#273149] dark:bg-[#202941]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-[#4454ee]">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">观看视频</div>
                    <div className="font-black text-lg text-black dark:text-white">{day.video_count} 个</div>
                  </div>
                </div>
              )}

              {day.words_marked > 0 && (
                <div className="flex items-center gap-3 rounded-[10px] border border-[#e7eaf2] bg-[#f8faff] p-3 dark:border-[#273149] dark:bg-[#202941]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-[#f0efff]">
                    <BookOpen className="w-5 h-5 text-[#5a45d6]" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">标记单词</div>
                    <div className="font-black text-lg text-black dark:text-white">{day.words_marked} 个</div>
                  </div>
                </div>
              )}

              {day.phrases_marked > 0 && (
                <div className="flex items-center gap-3 rounded-[10px] border border-[#e7eaf2] bg-[#f8faff] p-3 dark:border-[#273149] dark:bg-[#202941]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-[#6550ff]">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">标记词组</div>
                    <div className="font-black text-lg text-black dark:text-white">{day.phrases_marked} 个</div>
                  </div>
                </div>
              )}

              {day.expressions_marked > 0 && (
                <div className="flex items-center gap-3 rounded-[10px] border border-[#e7eaf2] bg-[#f8faff] p-3 dark:border-[#273149] dark:bg-[#202941]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-[#ff9f43]">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">地道用法</div>
                    <div className="font-black text-lg text-black dark:text-white">{day.expressions_marked} 个</div>
                  </div>
                </div>
              )}

              {day.total_minutes > 0 && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                  学习时长: {Math.round(day.total_minutes)} 分钟
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center mb-3">
                <span className="text-3xl">😴</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">这一天没有学习记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 主组件
export default function LearningCalendar() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  // 使用 SWR 获取日历数据，自动缓存和后台刷新
  const { data: response, isLoading } = useSWR<CalendarResponse>(
    `/api/user/learning-calendar?year=${year}&month=${month}`,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      return json.data
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1分钟内不重复请求
    }
  )
  const data = response || null

  // 上一月
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1))
  }

  // 下一月
  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1))
  }

  // 获取当月第一天是星期几
  const firstDayOfWeek = useMemo(() => new Date(year, month - 1, 1).getDay(), [year, month])
  // 当月天数
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month])

  // 构建日历网格
  const calendarDays: (CalendarDay | null)[] = useMemo(() => {
    const days: (CalendarDay | null)[] = []

    // 填充前面的空白
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }

    // 填充日期
    const dayMap = new Map<string, CalendarDay>()
    data?.days.forEach(day => dayMap.set(day.date, day))

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayData = dayMap.get(dateStr) || {
        date: dateStr,
        video_count: 0,
        words_marked: 0,
        phrases_marked: 0,
        expressions_marked: 0,
        total_minutes: 0,
        video_ids: [],
      }
      days.push(dayData)
    }

    return days
  }, [firstDayOfWeek, daysInMonth, data?.days, year, month])

  // 获取今天的日期字符串（使用 useMemo 避免每次渲染都计算）
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#e7eaf2] bg-white shadow-[0_10px_28px_rgba(31,42,104,0.06)] transition-colors duration-300 dark:border-[#273149] dark:bg-[#141b2d]">
      {/* 头部 - 紧凑 */}
      <div className="border-b border-[#e7eaf2] bg-[#f8faff] p-2 dark:border-[#273149] dark:bg-[#18213a]">
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-white text-[#4f586d] shadow-[0_4px_10px_rgba(31,42,104,0.06)] transition-all hover:-translate-y-0.5 hover:text-[#2d39bb] dark:bg-[#202941] dark:text-[#c5cce0]"
          >
            <ChevronLeft className="w-2.5 h-2.5 text-black dark:text-white" />
          </button>

          <h2 className="text-xs font-extrabold text-[#121729] dark:text-white">
            {year} 年 {month} 月
          </h2>

          <button
            onClick={nextMonth}
            className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-white text-[#4f586d] shadow-[0_4px_10px_rgba(31,42,104,0.06)] transition-all hover:-translate-y-0.5 hover:text-[#2d39bb] dark:bg-[#202941] dark:text-[#c5cce0]"
          >
            <ChevronRight className="w-2.5 h-2.5 text-black dark:text-white" />
          </button>
        </div>
      </div>

      {/* 日历主体 - 紧凑 */}
      <div className="p-1.5">
        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-[7px] font-black text-gray-500 dark:text-gray-400 py-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#d7dceb] border-t-[#4454ee]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />
              }

              const dayNum = parseInt(day.date.split('-')[2], 10)
              const isToday = day.date === today
              const hasActivity = day.video_count > 0 || day.words_marked > 0 || day.phrases_marked > 0 || day.expressions_marked > 0

              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(day)}
                  className={`
                    aspect-square flex items-center justify-center text-[8px] font-bold
                    rounded-[6px] border transition-all duration-150
                    ${getIntensityColor(day)}
                    ${getIntensityBorder(day)}
                    ${isToday ? 'ring-1 ring-blue-500' : ''}
                    ${hasActivity ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                  `}
                >
                  <span className={`${hasActivity ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                    {dayNum}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* 图例 - 紧凑 */}
        <div className="flex items-center justify-center gap-0.5 mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-600">
          <span className="text-[6px] text-gray-500 dark:text-gray-400">少</span>
          <div className="h-2 w-2 rounded-[2px] border border-[#e7eaf2] bg-[#f3f5fb] dark:border-[#273149] dark:bg-[#202941]" />
          <div className="h-2 w-2 rounded-[2px] border border-[#cbd3ff] bg-[#edf0ff] dark:border-[#5363d6] dark:bg-[#24305a]" />
          <div className="h-2 w-2 rounded-[2px] border border-[#cbd3ff] bg-[#c6d0ff] dark:border-[#5363d6] dark:bg-[#34478b]" />
          <div className="h-2 w-2 rounded-[2px] border border-[#cbd3ff] bg-[#7f8cff] dark:border-[#5363d6] dark:bg-[#6574ff]" />
          <span className="text-[6px] text-gray-500 dark:text-gray-400">多</span>
        </div>
      </div>

      {/* 月度统计 - 紧凑 */}
      {data?.stats && (
        <div className="border-t border-[#e7eaf2] bg-[#f8faff] p-2 dark:border-[#273149] dark:bg-[#101626]">
          <div className="grid grid-cols-4 gap-0.5">
            <div className="rounded-[6px] bg-white p-1 text-center dark:bg-[#202941]">
              <Video className="w-2 h-2 text-blue-500 mx-auto" />
              <div className="font-black text-[9px] text-black dark:text-white">{data.stats.total_videos}</div>
            </div>

            <div className="rounded-[6px] bg-white p-1 text-center dark:bg-[#202941]">
              <BookOpen className="w-2 h-2 text-[#5a45d6] mx-auto" />
              <div className="font-black text-[9px] text-black dark:text-white">{data.stats.total_words}</div>
            </div>

            <div className="rounded-[6px] bg-white p-1 text-center dark:bg-[#202941]">
              <MessageSquare className="w-2 h-2 text-purple-500 mx-auto" />
              <div className="font-black text-[9px] text-black dark:text-white">{data.stats.total_phrases}</div>
            </div>

            <div className="rounded-[6px] bg-white p-1 text-center dark:bg-[#202941]">
              <Sparkles className="w-2 h-2 text-orange-500 mx-auto" />
              <div className="font-black text-[9px] text-black dark:text-white">{data.stats.total_expressions}</div>
            </div>
          </div>

          {/* 活跃天数 */}
          <div className="mt-1 text-center">
            <span className="text-[7px] text-gray-500 dark:text-gray-400">
              学习 <span className="font-black text-[#4454ee]">{data.stats.active_days}</span> 天
            </span>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {selectedDay && (
        <DayDetailModal day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  )
}
