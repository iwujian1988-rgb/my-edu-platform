'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestProgressRPCPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testRPC = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Please login first')
        setLoading(false)
        return
      }

      console.log('[Test] Testing RPC for user:', user.id)

      const startTime = Date.now()
      const { data, error: rpcError } = await supabase.rpc('get_user_progress_cards', {
        p_user_id: user.id
      })
      const endTime = Date.now()
      const duration = endTime - startTime

      if (rpcError) {
        console.error('[Test] RPC Error:', rpcError)
        setError(`RPC Error: ${rpcError.message} (Code: ${rpcError.code})`)
        return
      }

      console.log('[Test] RPC Success:', { data, duration })

      setResult({
        success: true,
        data: data,
        performance: duration,
        user: user.email
      })

    } catch (err: any) {
      console.error('[Test] Exception:', err)
      setError(`Exception: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        🧪 进度卡片 RPC 函数测试
      </h1>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={testRPC}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: loading ? '#ccc' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '测试中...' : '🧪 测试 RPC 函数'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          background: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          color: '#991b1b',
          marginBottom: '20px'
        }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>❌ 错误</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{error}</pre>
        </div>
      )}

      {result && (
        <div style={{
          padding: '16px',
          background: '#d1fae5',
          border: '1px solid #10b981',
          borderRadius: '8px',
          color: '#065f46',
          marginBottom: '20px'
        }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>✅ 测试成功</h3>
          <div style={{ marginBottom: '12px' }}>
            <strong>用户:</strong> {result.user}<br />
            <strong>返回条数:</strong> {result.data?.length || 0}<br />
            <strong>性能:</strong> {result.performance}ms
            {result.performance < 200 && ' ✅ (< 200ms)'}
            {result.performance >= 200 && ' ⚠️ (>= 200ms)'}
          </div>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '8px' }}>
              查看完整数据
            </summary>
            <pre style={{
              background: 'white',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div style={{
        background: '#f8fafc',
        padding: '20px',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <h2 style={{ fontWeight: 'bold', marginBottom: '12px' }}>📋 测试说明</h2>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>确保已登录系统</li>
          <li>确保已完成数据库 Migration（在 Supabase Dashboard 执行 SQL）</li>
          <li>点击上方"测试 RPC 函数"按钮</li>
          <li>检查返回结果：
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>返回条数：0-3条（取决于学习记录数）</li>
              <li>性能：小于 200ms ✅</li>
              <li>数据完整性：包含 book_id, book_title, mode, scope_type, progress 等</li>
            </ul>
          </li>
        </ol>

        <h2 style={{ fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>⚠️ 常见错误</h2>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Code 42883</strong>: 函数不存在，需要先执行 Migration</li>
          <li><strong>Permission denied</strong>: 数据库权限不足</li>
          <li><strong>NULL value</strong>: 没有学习记录数据</li>
        </ul>
      </div>
    </div>
  )
}
