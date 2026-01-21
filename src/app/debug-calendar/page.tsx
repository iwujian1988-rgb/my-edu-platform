import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DebugCalendarPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()

  // 查询 word_progress 数据
  const { data: wordsData, error } = await supabase
    .from('word_progress')
    .select('created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50)

  // 统计每月的数据
  const monthCounts = new Map<string, number>()
  wordsData?.forEach((word: any) => {
    const date = new Date(word.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1)
  })

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-2xl font-black mb-4">日历数据调试</h1>

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">用户信息</h2>
        <p>用户ID: {user.id}</p>
        <p>当前时间: {new Date().toISOString()}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">按月统计</h2>
        <div className="space-y-2">
          {Array.from(monthCounts.entries()).map(([month, count]) => (
            <div key={month} className="p-2 border rounded">
              {month}: <span className="font-bold">{count}</span> 个单词
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">最近20条记录</h2>
        <div className="space-y-1 text-sm font-mono">
          {wordsData?.map((word: any, index: number) => {
            const createdDate = new Date(word.created_at)
            const updatedDate = new Date(word.updated_at)
            return (
              <div key={index} className="p-2 border rounded">
                {index + 1}. 创建: {createdDate.toLocaleString('zh-CN')} | 更新: {updatedDate.toLocaleString('zh-CN')}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
