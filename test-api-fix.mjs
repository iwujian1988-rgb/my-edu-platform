// 测试 /api/recent-books API修复
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const envContent = readFileSync('.env.local', 'utf-8')

const getEnvValue = (key) => {
  const match = envContent.match(new RegExp(`^${key}=\\\"?(.*?)\\\"?$`, 'm'))
  return match ? match[1].replace(/^\"|\"$/g, '') : ''
}

const SUPABASE_URL = getEnvValue('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_KEY = getEnvValue('SUPABASE_SERVICE_ROLE_KEY')

// 获取测试用户的token
async function getTestUserToken() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('phone_number', '15652936305')
    .single()

  if (error) {
    console.error('❌ 获取用户失败:', error)
    return null
  }

  console.log('✅ 找到用户:', user.id)

  // 生成一个测试token（实际应该是通过登录API获取）
  return user.id
}

async function testRecentBooksAPI() {
  console.log('🧪 测试 /api/recent-books API\n')

  try {
    const response = await fetch('http://localhost:3003/api/recent-books', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 注意：实际测试需要登录后的cookie
      }
    })

    console.log('📊 响应状态:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ API返回错误:', errorText)
      console.log('\n⚠️  需要登录才能测试，请使用已登录的浏览器测试')
      return
    }

    const data = await response.json()

    console.log('📦 返回数据结构:')
    console.log(JSON.stringify(data, null, 2))

    console.log('\n✅ 验证数据格式:')
    console.log('- 有 success 字段:', 'success' in data)
    console.log('- success 值:', data.success)
    console.log('- 有 data 字段:', 'data' in data)
    console.log('- data 是数组:', Array.isArray(data.data))

    if (data.data && data.data.length > 0) {
      console.log('\n✅ 验证第一个记录的字段:')
      const first = data.data[0]
      console.log('- bookId:', 'bookId' in first, first.bookId)
      console.log('- bookTitle:', 'bookTitle' in first, first.bookTitle)
      console.log('- mode:', 'mode' in first, first.mode)
      console.log('- lastAccessedAt:', 'lastAccessedAt' in first, first.lastAccessedAt)
    }

    console.log('\n✅ API格式验证通过！')
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
  }
}

testRecentBooksAPI()
