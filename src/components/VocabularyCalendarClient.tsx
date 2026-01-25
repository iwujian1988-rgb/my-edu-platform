'use client'

import { useMemo, useRef, useEffect } from 'react'

interface DailyData {
  date: string
  count: number
}

interface VocabularyCalendarClientProps {
  dailyData: DailyData[]
}

export function VocabularyCalendarClient({ dailyData }: VocabularyCalendarClientProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 默认滚动到最右边（显示当前月份）
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth
    }
  }, [])
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
      // ⚠️ 使用更可靠的日期格式化方法（与 calendar/page.tsx 完全一致）
      const year = checkDate.getFullYear()
      const month = String(checkDate.getMonth() + 1).padStart(2, '0')
      const day = String(checkDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      const count = dataMap.get(dateStr) || 0
      const level = getColorLevel(count, maxCount)

      // 调试：记录1月12日的数据
      if (dateStr === '2026-01-12') {
        console.log('🎯 找到1月12日！', {
          dateStr,
          count,
          level,
          dataMapHas: dataMap.has(dateStr),
          dataMapGet: dataMap.get(dateStr),
          dailyData: dailyData[0]
        })
      }

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

  const getCellColor = (level: number): { bg: string; border: string } => {
    switch (level) {
      case 0: return { bg: '#F3F4F6', border: '#D1D5DB' }
      case 1: return { bg: '#BBF7D0', border: '#86EFAC' }
      case 2: return { bg: '#86EFAC', border: '#22C55E' }
      case 3: return { bg: '#22C55E', border: '#15803D' }
      case 4: return { bg: '#15803D', border: '#166534' }
      case 5: return { bg: '#166534', border: '#14532D' }
      default: return { bg: '#F3F4F6', border: '#D1D5DB' }
    }
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // 动态生成月份和年份标签
  const getMonthLabels = () => {
    if (calendarData.length === 0) return { months: [], years: [], yearChangeWeeks: [] }

    const monthLabels: Array<{ label: string; weekIndex: number }> = []
    const yearLabels: Array<{ year: number; weekIndex: number }> = []
    const yearChangeWeeks: number[] = []

    let labelWeekInterval = 0
    let lastLabeledMonth = -1
    let lastLabeledYear = -1
    let previousYear = -1

    calendarData.forEach((week, weekIndex) => {
      // 找到本周第一个有效日期
      const firstDay = week.find(d => d.date !== '')
      if (firstDay && firstDay.date) {
        const date = new Date(firstDay.date)
        const currentMonth = date.getMonth()
        const currentYear = date.getFullYear()

        // 记录年份切换的位置
        if (previousYear !== -1 && currentYear !== previousYear) {
          yearChangeWeeks.push(weekIndex)
        }
        previousYear = currentYear

        // 每隔约8-10周（2-3个月）显示一次月份标签
        const shouldShowLabel = weekIndex === 0 ||
          weekIndex - labelWeekInterval >= 8 ||
          currentMonth !== lastLabeledMonth && weekIndex - labelWeekInterval >= 4

        if (shouldShowLabel) {
          // 添加月份标签
          monthLabels.push({
            label: months[currentMonth],
            weekIndex
          })

          // 如果年份变化，添加年份标签
          if (currentYear !== lastLabeledYear) {
            yearLabels.push({
              year: currentYear,
              weekIndex
            })
            lastLabeledYear = currentYear
          }

          labelWeekInterval = weekIndex
          lastLabeledMonth = currentMonth
        }
      }
    })

    return { months: monthLabels, years: yearLabels, yearChangeWeeks }
  }

  return (
    <div className="w-full overflow-x-auto" ref={scrollContainerRef}>
      {/* 滑动提示 */}
      <div className="text-center mb-3">
        <p className="text-xs transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
          ← Swipe left to see history · Swipe right for recent →
        </p>
      </div>

      <div className="min-w-[800px]">
        {(() => {
          const { months: monthLabels, years: yearLabels, yearChangeWeeks } = getMonthLabels()

          return (
            <>
              {/* 年份标签行 */}
              <div className="flex mb-1 items-end h-5">
                {/* 占位符：对齐星期标签列 */}
                <div className="w-8 mr-2 flex-shrink-0"></div>
                {calendarData.map((week, weekIndex) => {
                  const yearLabel = yearLabels.find(l => l.weekIndex === weekIndex)
                  return (
                    <div key={weekIndex} className="flex-1 min-w-[12px] flex items-end">
                      {yearLabel && (
                        <span className="text-xs font-black transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                          {yearLabel.year}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 月份标签行 */}
              <div className="flex mb-4 items-end h-6">
                {/* 占位符：对齐星期标签列 */}
                <div className="w-8 mr-2 flex-shrink-0"></div>
                {calendarData.map((week, weekIndex) => {
                  const monthLabel = monthLabels.find(l => l.weekIndex === weekIndex)
                  return (
                    <div key={weekIndex} className="flex-1 min-w-[12px] flex items-end">
                      {monthLabel && (
                        <span className="text-sm font-bold whitespace-nowrap transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                          {monthLabel.label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )
        })()}

        {/* 日历网格 */}
        <div className="flex gap-1">
          {/* 星期标签 */}
          <div className="flex flex-col gap-1 mr-2">
            {weekDays.map((day, index) => (
              <div key={index} className="h-3 flex items-center justify-center">
                {index % 2 === 1 && <span className="text-xs font-bold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>{day}</span>}
              </div>
            ))}
          </div>

          {/* 周数据 */}
          {(() => {
            const { yearChangeWeeks } = getMonthLabels()

            return calendarData.map((week, weekIndex) => {
              const isYearChange = yearChangeWeeks.includes(weekIndex)

              return (
                <div key={weekIndex} className="relative">
                  {/* 年份分隔线 */}
                  {isYearChange && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-px"
                      style={{
                        background: 'linear-gradient(to bottom, transparent, #e5e7eb 20%, #e5e7eb 80%, transparent)',
                        transform: 'translateX(-50%)'
                      }}
                    />
                  )}

                  {/* 周数据列 */}
                  <div className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => {
                      const colors = getCellColor(day.level)
                      return (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          className="w-3 h-3 rounded-sm transition-all hover:scale-125 hover:z-10"
                          style={{
                            backgroundColor: colors.bg,
                            border: day.level > 0 ? '1px solid #000000' : '1px solid ' + colors.border,
                          }}
                          title={day.date ? `${day.date}: ${day.count} words` : ''}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </div>
    </div>
  )
}
