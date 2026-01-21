'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function TestReadingProgressPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [bookId, setBookId] = useState('003b4ce0-c3f9-407a-a7d6-5e80ada4eae5') // 默认书ID

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  // 获取当前用户
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        addLog(`✅ 用户已登录: ${user.id}`)
      } else {
        addLog('❌ 用户未登录')
      }
    }
    getCurrentUser()
  }, [])

  // 测试1：检查表结构
  const checkTableStructure = async () => {
    addLog('🔍 测试1：检查表结构...')

    const { data, error } = await supabase
      .from('user_book_preferences')
      .select('*')
      .limit(1)

    if (error) {
      addLog(`❌ 查询失败: ${JSON.stringify(error)}`)
    } else {
      addLog(`✅ 查询成功，列: ${Object.keys(data[0] || {}).join(', ')}`)
      const hasField = data[0] && 'last_reading_progress' in (data[0] as any)
      addLog(hasField ? '✅ last_reading_progress 字段存在' : '❌ last_reading_progress 字段不存在')
    }
  }

  // 测试2：保存进度
  const saveProgress = async () => {
    addLog('🔍 测试2：保存进度...')

    if (!userId) {
      addLog('❌ 用户未登录，无法保存')
      return
    }

    const progress = {
      bookId,
      page: 3,
      theme: 'all',
      scenario: 'all',
      chapter: 'all',
      status: 'all'
    }

    const { data, error } = await supabase
      .from('user_book_preferences')
      .upsert({
        user_id: userId,
        book_id: bookId,
        last_reading_progress: progress,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,book_id'
      })

    if (error) {
      addLog(`❌ 保存失败: ${JSON.stringify(error)}`)
    } else {
      addLog(`✅ 保存成功: ${JSON.stringify(progress)}`)
    }
  }

  // 测试3：读取进度
  const readProgress = async () => {
    addLog('🔍 测试3：读取进度...')

    if (!userId) {
      addLog('❌ 用户未登录，无法读取')
      return
    }

    const { data, error } = await supabase
      .from('user_book_preferences')
      .select('last_reading_progress')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .maybeSingle()

    if (error) {
      addLog(`❌ 读取失败: ${JSON.stringify(error)}`)
    } else if (data) {
      const progress = (data as any).last_reading_progress
      addLog(`✅ 读取成功: ${JSON.stringify(progress)}`)
    } else {
      addLog('ℹ️ 没有找到保存的进度')
    }
  }

  // 测试4：查看所有记录
  const viewAllRecords = async () => {
    addLog('🔍 测试4：查看所有记录...')

    if (!userId) {
      addLog('❌ 用户未登录')
      return
    }

    const { data, error } = await supabase
      .from('user_book_preferences')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      addLog(`❌ 查询失败: ${JSON.stringify(error)}`)
    } else {
      addLog(`✅ 找到 ${data.length} 条记录`)
      data.forEach((record: any) => {
        addLog(`  - book_id: ${record.book_id}, progress: ${JSON.stringify(record.last_reading_progress)}`)
      })
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 阅读进度调试工具</h1>

      <div style={{ marginBottom: '20px' }}>
        <label>
          Book ID:{' '}
          <input
            type="text"
            value={bookId}
            onChange={(e) => setBookId(e.target.value)}
            style={{ width: '400px', padding: '8px' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={checkTableStructure} style={{ padding: '10px 20px' }}>
          测试1: 检查表结构
        </button>
        <button onClick={saveProgress} style={{ padding: '10px 20px' }}>
          测试2: 保存进度
        </button>
        <button onClick={readProgress} style={{ padding: '10px 20px' }}>
          测试3: 读取进度
        </button>
        <button onClick={viewAllRecords} style={{ padding: '10px 20px' }}>
          测试4: 查看所有记录
        </button>
        <button onClick={() => setLogs([])} style={{ padding: '10px 20px', background: '#666' }}>
          清空日志
        </button>
      </div>

      <div style={{
        background: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        height: '500px',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '13px',
        lineHeight: '1.6'
      }}>
        {logs.length === 0 ? (
          <p style={{ color: '#999' }}>点击上方按钮开始测试...</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              {log}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#e7f3ff', borderRadius: '8px' }}>
        <h3>📋 使用说明</h3>
        <ol style={{ lineHeight: '1.8' }}>
          <li>点击"测试1: 检查表结构"，确认 last_reading_progress 字段存在</li>
          <li>点击"测试2: 保存进度"，保存测试数据（页码=3）</li>
          <li>点击"测试3: 读取进度"，验证能读取到保存的数据</li>
          <li>点击"测试4: 查看所有记录"，查看所有保存的进度</li>
          <li>然后访问 <a href={`/library/${bookId}?page=5`} target="_blank">词书详情页</a>，应该能看到恢复提示</li>
        </ol>
      </div>
    </div>
  )
}
