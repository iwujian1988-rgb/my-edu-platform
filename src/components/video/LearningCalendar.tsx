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
  if (total === 0) return 'bg-gray-100 dark:bg-gray-700'
  if (total <= 3) return 'bg-green-200 dark:bg-green-900'
  if (total <= 6) return 'bg-green-300 dark:bg-green-800'
  if (total <= 10) return 'bg-green-400 dark:bg-green-700'
  return 'bg-[#B4F416] dark:bg-green-600'
}

// 获取强度边框颜色
const getIntensityBorder = (day: CalendarDay): string => {
  const total = day.video_count + day.words_marked + day.phrases_marked + day.expressions_marked
  if (total === 0) return 'border-gray-300 dark:border-gray-600'
  return 'border-black dark:border-gray-500'
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
        className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] rounded-sm max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b-[3px] border-black dark:border-gray-600">
          <h3 className="font-black text-lg text-black dark:text-white">{dateStr}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 border-[2px] border-black dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <X className="w-4 h-4 text-black dark:text-white" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4">
          {hasActivity ? (
            <div className="space-y-3">
              {day.video_count > 0 && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 border-[2px] border-gray-200 dark:border-gray-600 rounded-sm">
                  <div className="w-10 h-10 bg-blue-500 border-[2px] border-black flex items-center justify-center">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">观看视频</div>
                    <div className="font-black text-lg text-black dark:text-white">{day.video_count} 个</div>
                  </div>
                </div>
              )}

              {day.words_marked > 0 && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 border-[2px] border-gray-200 dark:border-gray-600 rounded-sm">
                  <div className="w-10 h-10 bg-[#B4F416] border-[2px] border-black flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">标记单词</div>
                    <div className="font-black text-lg text-black dark:text-white">{day.words_marked} 个</div>
                  </div>
                </div>
              )}

              {day.phrases_marked > 0 && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 border-[2px] border-gray-200 dark:border-gray-600 rounded-sm">
                  <div className="w-10 h-10 bg-purple-500 border-[2px] border-black flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">标记词组</div>
                    <div className="font-black text-lg text-black dark:text-white">{day.phrases_marked} 个</div>
                  </div>
                </div>
              )}

              {day.expressions_marked > 0 && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 border-[2px] border-gray-200 dark:border-gray-600 rounded-sm">
                  <div className="w-10 h-10 bg-orange-500 border-[2px] border-black flex items-center justify-center">
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
    <div className="bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] overflow-hidden transition-colors duration-300">
      {/* 头部 - 紧凑 */}
      <div className="bg-[#B4F416] border-b-[2px] border-black dark:border-gray-600 p-1.5">
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="w-5 h-5 flex items-center justify-center bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 shadow-[1px_1px_0px_0px_#000] hover:shadow-[0.5px_0.5px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
          >
            <ChevronLeft className="w-2.5 h-2.5 text-black dark:text-white" />
          </button>

          <h2 className="font-black text-[10px] text-black">
            {year} 年 {month} 月
          </h2>

          <button
            onClick={nextMonth}
            className="w-5 h-5 flex items-center justify-center bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 shadow-[1px_1px_0px_0px_#000] hover:shadow-[0.5px_0.5px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
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
            <div className="inline-block animate-spin h-3 w-3 border-[2px] border-black dark:border-gray-500 border-t-[#B4F416]"></div>
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
                    border-[1px] transition-all duration-150
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
          <div className="w-2 h-2 bg-gray-100 dark:bg-gray-700 border-[1px] border-gray-300 dark:border-gray-600" />
          <div className="w-2 h-2 bg-green-200 dark:bg-green-900 border-[1px] border-black dark:border-gray-600" />
          <div className="w-2 h-2 bg-green-400 dark:bg-green-700 border-[1px] border-black dark:border-gray-600" />
          <div className="w-2 h-2 bg-[#B4F416] dark:bg-green-600 border-[1px] border-black dark:border-gray-600" />
          <span className="text-[6px] text-gray-500 dark:text-gray-400">多</span>
        </div>
      </div>

      {/* 月度统计 - 紧凑 */}
      {data?.stats && (
        <div className="border-t-[2px] border-black dark:border-gray-600 p-1.5 bg-gray-50 dark:bg-gray-900">
          <div className="grid grid-cols-4 gap-0.5">
            <div className="bg-white dark:bg-gray-800 border-[1px] border-black dark:border-gray-600 p-1 text-center">
              <Video className="w-2 h-2 text-blue-500 mx-auto" />
              <div className="font-black text-[9px] text-black dark:text-white">{data.stats.total_videos}</div>
            </div>

            <div className="bg-white dark:bg-gray-800 border-[1px] border-black dark:border-gray-600 p-1 text-center">
              <BookOpen className="w-2 h-2 text-[#B4F416] mx-auto" />
              <div className="font-black text-[9px] text-black dark:text-white">{data.stats.total_words}</div>
            </div>

            <div className="bg-white dark:bg-gray-800 border-[1px] border-black dark:border-gray-600 p-1 text-center">
              <MessageSquare className="w-2 h-2 text-purple-500 mx-auto" />
              <div className="font-black text-[9px] text-black dark:text-white">{data.stats.total_phrases}</div>
            </div>

            <div className="bg-white dark:bg-gray-800 border-[1px] border-black dark:border-gray-600 p-1 text-center">
              <Sparkles className="w-2 h-2 text-orange-500 mx-auto" />
              <div className="font-black text-[9px] text-black dark:text-white">{data.stats.total_expressions}</div>
            </div>
          </div>

          {/* 活跃天数 */}
          <div className="mt-1 text-center">
            <span className="text-[7px] text-gray-500 dark:text-gray-400">
              学习 <span className="font-black text-[#B4F416]">{data.stats.active_days}</span> 天
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
