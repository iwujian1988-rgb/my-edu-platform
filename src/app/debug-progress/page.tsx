import { createClient, getCurrentUser } from '@/lib/supabase/server'

export default async function DebugProgressPage() {
  const user = await getCurrentUser()

  if (!user) {
    return <div className="p-8">请先登录</div>
  }

  const supabase = await createClient()

  // 查询当前用户的word_progress记录
  const { data: allProgress, error } = await supabase
    .from('word_progress')
    .select('*')
    .eq('user_id', user.id)

  // 统计各状态的单词数量
  const statusCount = {
    new: 0,
    known: 0,
    fuzzy: 0,
    unknown: 0
  }

  allProgress?.forEach((record: any) => {
    if (record.status in statusCount) {
      statusCount[record.status as keyof typeof statusCount]++
    }
  })

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F8F5F2' }}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black mb-6">📊 单词进度调试</h1>

        <div className="clay-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">用户信息</h2>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>User ID:</strong> {user.id}</p>
        </div>

        <div className="clay-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">统计</h2>
          <p><strong>总记录数:</strong> {allProgress?.length || 0}</p>
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{statusCount.new}</div>
              <div className="text-sm text-gray-600">未标注</div>
            </div>
            <div className="bg-green-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{statusCount.known}</div>
              <div className="text-sm text-green-600">认识</div>
            </div>
            <div className="bg-yellow-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{statusCount.fuzzy}</div>
              <div className="text-sm text-yellow-600">模糊</div>
            </div>
            <div className="bg-red-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{statusCount.unknown}</div>
              <div className="text-sm text-red-600">不认识</div>
            </div>
          </div>
        </div>

        <div className="clay-card p-6">
          <h2 className="text-xl font-bold mb-4">详细记录 (前10条)</h2>
          {error && <p className="text-red-600">错误: {error.message}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Word ID</th>
                  <th className="text-left p-2">Book ID</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Updated At</th>
                </tr>
              </thead>
              <tbody>
                {allProgress?.slice(0, 10).map((record: any) => (
                  <tr key={record.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{record.word_id}</td>
                    <td className="p-2 font-mono text-xs">{record.book_id}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        record.status === 'known' ? 'bg-green-100 text-green-700' :
                        record.status === 'fuzzy' ? 'bg-yellow-100 text-yellow-700' :
                        record.status === 'unknown' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-2 text-xs">{new Date(record.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
