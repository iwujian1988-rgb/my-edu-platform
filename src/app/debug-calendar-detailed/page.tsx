import { createClient, getCurrentUser } from '@/lib/supabase/server'

export default async function DebugCalendarDetailedPage() {
  const user = await getCurrentUser()
  if (!user) {
    return <div>未登录</div>
  }

  const supabase = await createClient()

  // 查询 word_progress 数据
  const { data: wordsData } = await supabase
    .from('word_progress')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  // 按日期分组统计（使用本地时区）- 和 calendar/page.tsx 完全相同的逻辑
  const dateMap = new Map<string, number>()

  wordsData?.forEach((word: any) => {
    const localDate = new Date(word.created_at)
    const dateStr = localDate.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    }).replace(/\//g, '-').split(' ')[0]
    dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1)
  })

  // 转换为数组
  const dailyData = Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // 测试：模拟 VocabularyCalendarClient 的日期生成
  const today = new Date()
  const oneYearAgo = new Date(today)
  oneYearAgo.setDate(oneYearAgo.getDate() - 10) // 只看最近10天

  const testDates: Array<{ dateStr: string; dateStr2: string; hasData: boolean }> = []
  const checkDate = new Date(oneYearAgo)
  while (checkDate <= today) {
    // 方法1: toISOString
    const dateStr1 = checkDate.toISOString().split('T')[0]
    // 方法2: toLocaleString
    const dateStr2 = checkDate.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    }).replace(/\//g, '-').split(' ')[0]

    testDates.push({
      dateStr: dateStr1,
      dateStr2: dateStr2,
      hasData: dateMap.has(dateStr2)
    })
    checkDate.setDate(checkDate.getDate() + 1)
  }

  return (
    <div className="p-8 bg-white min-h-screen">
      <h1 className="text-2xl font-black mb-4">日历数据详细调试</h1>

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">用户信息</h2>
        <p>用户ID: {user.id}</p>
        <p>当前时间: {new Date().toISOString()}</p>
        <p>当前本地时间: {new Date().toLocaleString('zh-CN')}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">原始数据（前10条）</h2>
        <div className="space-y-1 text-sm font-mono bg-gray-50 p-4 rounded">
          {wordsData?.slice(0, 10).map((word, index) => {
            const createdDate = new Date(word.created_at)
            const dateStr = createdDate.toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour12: false
            }).replace(/\//g, '-').split(' ')[0]
            return (
              <div key={index}>
                {index + 1}. {word.created_at} (ISO) → {createdDate.toLocaleString('zh-CN')} (本地) → <strong>{dateStr}</strong> (分组key)
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">dailyData 数组（传递给组件的数据）</h2>
        <div className="space-y-1 text-sm font-mono bg-green-50 p-4 rounded">
          {dailyData.map((item, index) => (
            <div key={index}>
              日期: <strong>&quot;{item.date}&quot;</strong>, 数量: {item.count}
            </div>
          ))}
        </div>
        <p className="mt-2 text-gray-600">共 {dailyData.length} 天有数据</p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">最近10天日期格式测试</h2>
        <table className="border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">toISOString()</th>
              <th className="border border-gray-300 p-2">toLocaleString()</th>
              <th className="border border-gray-300 p-2">dateMap.has()?</th>
            </tr>
          </thead>
          <tbody>
            {testDates.map((d, i) => (
              <tr key={i} className={d.hasData ? 'bg-green-100' : 'bg-red-50'}>
                <td className="border border-gray-300 p-2">{d.dateStr}</td>
                <td className="border border-gray-300 p-2 font-bold">{d.dateStr2}</td>
                <td className="border border-gray-300 p-2 text-center">
                  {d.hasData ? '✅ 有数据' : '❌ 无数据'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">问题分析</h2>
        <div className="bg-yellow-50 p-4 rounded border border-yellow-300">
          <p className="mb-2"><strong>检查点1:</strong> dailyData 的日期格式是什么？</p>
          <p className="mb-2"><strong>检查点2:</strong> VocabularyCalendarClient 中生成的日期格式是什么？</p>
          <p className="mb-2"><strong>检查点3:</strong> 两种格式是否完全一致（包括引号、空格等）？</p>
          <p><strong>结论:</strong> 如果 toISOString() 和 toLocaleString() 格式不同，就匹配不上！</p>
        </div>
      </div>
    </div>
  )
}
