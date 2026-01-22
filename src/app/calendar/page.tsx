import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar as CalendarIcon, TrendingUp } from 'lucide-react'
import { VocabularyCalendarClient } from '@/components/VocabularyCalendarClient'

interface DailyData {
  date: string
  count: number
}

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirect=' + encodeURIComponent('/calendar'))
  }

  const supabase = await createClient()
  let dailyData: DailyData[] = []
  let totalWords = 0
  let streak = 0

  try {
    // 获取过去365天的数据（使用 created_at 统计首次学习）
    // ⚠️ 时区修复：获取本地时区的今天0点
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = new Date(today.getTime() - today.getTimezoneOffset() * 60000)

    const { data: wordsData } = await supabase
      .from('word_progress')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (wordsData) {
      totalWords = wordsData.length

      // 按日期分组统计（使用本地时区）
      const dateMap = new Map<string, number>()

      wordsData.forEach((word: any) => {
        // 转换为本地时区的日期字符串（使用手动拼接确保格式一致）
        const localDate = new Date(word.created_at)
        const year = localDate.getFullYear()
        const month = String(localDate.getMonth() + 1).padStart(2, '0')
        const day = String(localDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1)
      })

      // 转换为数组并排序
      dailyData = Array.from(dateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // 计算连续学习天数（streak）
      // ⚠️ 时区修复：使用本地时区的日期字符串
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      let checkDate = new Date(today)
      streak = 0
      let maxIterations = 366 // 防止无限循环，最多检查 366 天

      while (maxIterations > 0) {
        maxIterations--
        // 使用本地时区的日期字符串（与dateMap的key格式一致）
        const year = checkDate.getFullYear()
        const month = String(checkDate.getMonth() + 1).padStart(2, '0')
        const day = String(checkDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        if (dateMap.has(dateStr)) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else if (streak === 0) {
          // 如果今天没有学习，检查昨天
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
    }
  } catch (error) {
    console.error('Error fetching calendar data:', error)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F5F2' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-3 sm:px-4 md:px-6 py-3 md:py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="w-full mx-auto" style={{ maxWidth: '1400px' }}>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900">学习日历</h1>
              <p className="text-sm text-gray-500 mt-1">
                累计学习 {totalWords} 个单词 • 连续学习 {streak} 天
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 pt-12 pb-6 md:pb-8">
        <div className="w-full mx-auto" style={{ maxWidth: '1400px' }}>

          {/* Stats Cards - Neo-Brutalism */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
            {/* 累计单词 */}
            <div
              className="p-2 md:p-6"
              style={{
                backgroundColor: '#ffffff',
                border: '3px solid #000000',
                borderRadius: '12px',
                boxShadow: '4px 4px 0px 0px #000000',
              }}
            >
              <div className="flex items-center gap-1 md:gap-3 mb-1 md:mb-2">
                <div
                  className="w-5 h-5 md:w-10 md:h-10 flex items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: '#EFF6FF',
                    border: '2px solid #000000',
                  }}
                >
                  <CalendarIcon className="w-3 h-3 md:w-5 md:h-5" style={{ color: '#1D4ED8' }} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] md:text-sm font-black text-gray-600 hidden sm:block">累计单词</span>
              </div>
              <p className="text-lg md:text-3xl font-black text-gray-900">{totalWords}</p>
            </div>

            {/* 连续学习 */}
            <div
              className="p-2 md:p-6"
              style={{
                backgroundColor: '#ffffff',
                border: '3px solid #000000',
                borderRadius: '12px',
                boxShadow: '4px 4px 0px 0px #B4F416',
              }}
            >
              <div className="flex items-center gap-1 md:gap-3 mb-1 md:mb-2">
                <div
                  className="w-5 h-5 md:w-10 md:h-10 flex items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '2px solid #000000',
                  }}
                >
                  <TrendingUp className="w-3 h-3 md:w-5 md:h-5" style={{ color: '#15803D' }} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] md:text-sm font-black text-gray-600 hidden sm:block">连续学习</span>
              </div>
              <p className="text-lg md:text-3xl font-black text-gray-900">{streak} 天</p>
            </div>

            {/* 今日学习 */}
            <div
              className="p-2 md:p-6"
              style={{
                backgroundColor: '#ffffff',
                border: '3px solid #000000',
                borderRadius: '12px',
                boxShadow: '4px 4px 0px 0px #FACC15',
              }}
            >
              <div className="flex items-center gap-1 md:gap-3 mb-1 md:mb-2">
                <div
                  className="w-5 h-5 md:w-10 md:h-10 flex items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: '#F3E8FF',
                    border: '2px solid #000000',
                  }}
                >
                  <CalendarIcon className="w-3 h-3 md:w-5 md:h-5" style={{ color: '#7C3AED' }} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] md:text-sm font-black text-gray-600 hidden sm:block">今日学习</span>
              </div>
              <p className="text-lg md:text-3xl font-black text-gray-900">
                {(() => {
                  const today = new Date()
                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
                  const todayData = dailyData.find(d => d.date === todayStr)
                  return todayData?.count || 0
                })()}
              </p>
            </div>
          </div>

          {/* Calendar Heatmap - Neo-Brutalism */}
          <div
            className="p-4 md:p-6 mb-4 md:mb-6"
            style={{
              backgroundColor: '#ffffff',
              border: '3px solid #000000',
              borderRadius: '12px',
              boxShadow: '4px 4px 0px 0px #000000',
            }}
          >
            <VocabularyCalendarClient dailyData={dailyData} />
          </div>

          {/* Legend - Neo-Brutalism */}
          <div
            className="flex items-center justify-center gap-3 md:gap-4 py-3 px-4 mb-4 md:mb-6"
            style={{
              backgroundColor: '#ffffff',
              border: '3px solid #000000',
              borderRadius: '12px',
              boxShadow: '3px 3px 0px 0px #000000',
            }}
          >
            <span className="text-xs md:text-sm font-black text-gray-600">少</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-sm border-2 border-black" style={{ backgroundColor: '#F3F4F6' }}></div>
              <div className="w-4 h-4 rounded-sm border-2 border-black" style={{ backgroundColor: '#BBF7D0' }}></div>
              <div className="w-4 h-4 rounded-sm border-2 border-black" style={{ backgroundColor: '#86EFAC' }}></div>
              <div className="w-4 h-4 rounded-sm border-2 border-black" style={{ backgroundColor: '#22C55E' }}></div>
              <div className="w-4 h-4 rounded-sm border-2 border-black" style={{ backgroundColor: '#15803D' }}></div>
            </div>
            <span className="text-xs md:text-sm font-black text-gray-600">多</span>
          </div>

        </div>
      </main>

      {/* 计数规则说明 - 页面底部 */}
      <div className="px-3 sm:px-4 md:px-6 pb-6">
        <div className="w-full mx-auto py-3 px-4 text-center" style={{ maxWidth: '1400px' }}>
          <div
            style={{
              backgroundColor: '#FEF3C7',
              border: '3px solid #000000',
              borderRadius: '12px',
              boxShadow: '3px 3px 0px 0px #000000',
            }}
          >
            <p className="text-[10px] md:text-xs font-black text-gray-700 leading-relaxed">
              📅 统计规则：按单词首次标记时间计算，每天每词只计1次，复习旧词不重复计数
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
