/**
 * 调试页面：验证服务端数据获取
 */

import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getWordsForBookServer } from '@/lib/words-server'

export default async function TestServerDataPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // 测试book ID
  const testBookId = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'

  // 调用服务端函数
  const result = await getWordsForBookServer(testBookId, user, 1, 5, 'all')

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 服务端数据获取测试</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>用户信息</h2>
        <p>User ID: {user.id}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>获取结果</h2>
        <p>Success: {result.success ? '✅' : '❌'}</p>
        <p>Total: {result.total}</p>
        <p>Count: {result.count}</p>
        {result.error && <p style={{ color: 'red' }}>Error: {result.error}</p>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>单词数据 ({result.words.length} 个)</h2>
        {result.words.length > 0 ? (
          <ul>
            {result.words.slice(0, 10).map((word, index) => (
              <li key={index}>
                <strong>{word.word}</strong>
                {word.status && ` [${word.status}]`}
                {word.chapter && ` - ${word.chapter}`}
                {word.theme && ` - ${word.theme}`}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: 'red' }}>❌ 没有获取到单词数据</p>
        )}
      </div>

      <div>
        <a href="/library/{testBookId}" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', textDecoration: 'none' }}>
          前往词库页面
        </a>
      </div>
    </div>
  )
}
