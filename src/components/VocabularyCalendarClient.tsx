'use client'

import { useMemo } from 'react'

interface DailyData {
  date: string
  count: number
}

interface VocabularyCalendarClientProps {
  dailyData: DailyData[]
}

export function VocabularyCalendarClient({ dailyData }: VocabularyCalendarClientProps) {
  // 计算颜色等级
  const getColorLevel = (count: number, maxCount: number): number => {
    if (count === 0) return 0
    if (maxCount === 0) return 0
    const ratio = count / maxCount
    if (ratio < 0.2) return 1
    if (ratio < 0.4) return 2
    if (ratio < 0.6) return 3
    if (ratio < 0.8) return 4
    return 5
  }

  // 生成过去365天的日历数据
  const calendarData = useMemo(() => {
    const today = new Date()
    const oneYearAgo = new Date(today)
    oneYearAgo.setDate(oneYearAgo.getDate() - 364)

    const dataMap = new Map(dailyData.map(d => [d.date, d.count]))
    const maxCount = Math.max(...dailyData.map(d => d.count), 1)

    // 按周分组（52-53周）
    const weeks: Array<Array<{ date: string; count: number; level: number }>> = []
    let currentWeek: Array<{ date: string; count: number; level: number }> = []
    let dayOfWeek = oneYearAgo.getDay() // 0 = Sunday, 1 = Monday, etc.

    // 填充第一周前面的空白天数
    for (let i = 0; i < dayOfWeek; i++) {
      currentWeek.push({ date: '', count: 0, level: 0 })
    }

    // 填充实际数据
    const checkDate = new Date(oneYearAgo)
    while (checkDate <= today) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const count = dataMap.get(dateStr) || 0
      const level = getColorLevel(count, maxCount)

      currentWeek.push({ date: dateStr, count, level })

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }

      checkDate.setDate(checkDate.getDate() + 1)
    }

    // 填充最后一周
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0, level: 0 })
      }
      weeks.push(currentWeek)
    }

    return weeks
  }, [dailyData])

  const getCellColor = (level: number): string => {
    switch (level) {
      case 0: return 'bg-gray-100'
      case 1: return 'bg-green-200'
      case 2: return 'bg-green-300'
      case 3: return 'bg-green-500'
      case 4: return 'bg-green-600'
      case 5: return 'bg-green-800'
      default: return 'bg-gray-100'
    }
  }

  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[800px]">
        {/* 月份标签 */}
        <div className="flex mb-2 ml-8">
          {calendarData.length > 0 && (
            <>
              <div className="flex-1">
                <span className="text-xs text-gray-500">{months[new Date(calendarData[0][0]?.date || new Date()).getMonth()]}</span>
              </div>
              <div className="flex-1">
                <span className="text-xs text-gray-500">{months[Math.min(4, 11)]}</span>
              </div>
              <div className="flex-1">
                <span className="text-xs text-gray-500">{months[Math.min(8, 11)]}</span>
              </div>
              <div className="flex-1">
                <span className="text-xs text-gray-500">{months[11]}</span>
              </div>
            </>
          )}
        </div>

        {/* 日历网格 */}
        <div className="flex gap-1">
          {/* 星期标签 */}
          <div className="flex flex-col gap-1 mr-2">
            {weekDays.map((day, index) => (
              <div key={index} className="h-3 flex items-center justify-center">
                {index % 2 === 1 && <span className="text-xs text-gray-400">{day}</span>}
              </div>
            ))}
          </div>

          {/* 周数据 */}
          {calendarData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`w-3 h-3 rounded-sm ${getCellColor(day.level)} transition-all hover:ring-2 hover:ring-purple-400`}
                  title={day.date ? `${day.date}: ${day.count} 个单词` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
