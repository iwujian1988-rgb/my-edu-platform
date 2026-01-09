import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar as CalendarIcon, TrendingUp } from 'lucide-react'
import { VocabularyCalendarClient } from '@/components/VocabularyCalendarClient'

interface DailyData {
  date: string
  count: number
}

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
    // 获取过去365天的数据（使用 updated_at 反映学习活动）
    const { data: wordsData } = await supabase
      .from('word_progress')
      .select('updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: true })

    if (wordsData) {
      totalWords = wordsData.length

      // 按日期分组统计
      const dateMap = new Map<string, number>()

      wordsData.forEach((word: any) => {
        const date = new Date(word.updated_at)
        const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
        dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1)
      })

      // 转换为数组并排序
      dailyData = Array.from(dateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // 计算连续学习天数（streak）
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      let checkDate = new Date(today)
      streak = 0
      let maxIterations = 366 // 防止无限循环，最多检查 366 天

      while (maxIterations > 0) {
        maxIterations--
        const dateStr = checkDate.toISOString().split('T')[0]
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
      <main className="px-3 sm:px-4 md:px-6 py-6 md:py-8">
        <div className="w-full mx-auto" style={{ maxWidth: '1400px' }}>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="clay-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 clay-card clay-icon flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">累计单词</span>
              </div>
              <p className="text-3xl font-black text-gray-900">{totalWords}</p>
            </div>

            <div className="clay-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 clay-card clay-icon flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">连续学习</span>
              </div>
              <p className="text-3xl font-black text-gray-900">{streak} 天</p>
            </div>

            <div className="clay-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 clay-card clay-icon flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">今日学习</span>
              </div>
              <p className="text-3xl font-black text-gray-900">
                {dailyData.length > 0 && dailyData[dailyData.length - 1]?.date === new Date().toISOString().split('T')[0]
                  ? dailyData[dailyData.length - 1].count
                  : 0}
              </p>
            </div>
          </div>

          {/* Calendar Heatmap */}
          <div className="clay-card p-6 mb-6">
            <VocabularyCalendarClient dailyData={dailyData} />
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <span>少</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded bg-gray-200"></div>
              <div className="w-4 h-4 rounded bg-green-200"></div>
              <div className="w-4 h-4 rounded bg-green-400"></div>
              <div className="w-4 h-4 rounded bg-green-600"></div>
              <div className="w-4 h-4 rounded bg-green-800"></div>
            </div>
            <span>多</span>
          </div>

        </div>
      </main>
    </div>
  )
}
