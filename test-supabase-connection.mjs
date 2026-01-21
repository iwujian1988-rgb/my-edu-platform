/**
 * 测试 Supabase 连接（不使用代理）
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODg1MzgsImV4cCI6MjA4MzE2NDUzOH0.1rUusdU-SyWMYNiiAfjrDtSFlcxlwn4FOv0X8bJC7Sk'

console.log('🧪 测试 1: DNS 解析')
console.log('=====================================')
const startTime = Date.now()

try {
  const response = await fetch(SUPABASE_URL, {
    method: 'HEAD',
    signal: AbortSignal.timeout(10000)
  })
  const dnsTime = Date.now() - startTime
  console.log(`✅ DNS 解析成功 (${dnsTime}ms)`)
  console.log(`状态码: ${response.status}`)
} catch (error) {
  const dnsTime = Date.now() - startTime
  console.log(`❌ DNS 解析失败 (${dnsTime}ms)`)
  console.log(`错误: ${error.message}`)
}

console.log('\n🧪 测试 2: Supabase Auth 连接')
console.log('=====================================')
const authStartTime = Date.now()

try {
  const authUrl = `${SUPABASE_URL}/auth/v1/user`
  const response = await fetch(authUrl, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    signal: AbortSignal.timeout(15000)
  })
  const authTime = Date.now() - authStartTime
  console.log(`✅ Auth API 连接成功 (${authTime}ms)`)
  console.log(`状态码: ${response.status}`)
  const data = await response.json()
  console.log(`响应:`, data)
} catch (error) {
  const authTime = Date.now() - authStartTime
  console.log(`❌ Auth API 连接失败 (${authTime}ms)`)
  console.log(`错误: ${error.message}`)
}

console.log('\n🧪 测试 3: 登录测试（正确的凭据）')
console.log('=====================================')
const loginStartTime = Date.now()

try {
  const email = '15652936305@phone.xiaoyu.com'
  const password = 'wj5236016'

  const loginUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15000)
  })
  const loginTime = Date.now() - loginStartTime
  console.log(`⏱️ 登录请求完成 (${loginTime}ms)`)
  console.log(`状态码: ${response.status}`)

  if (response.ok) {
    const data = await response.json()
    console.log(`✅ 登录成功！`)
    console.log(`用户 ID: ${data.user?.id}`)
    console.log(`访问令牌: ${data.access_token?.substring(0, 20)}...`)
  } else {
    const error = await response.json()
    console.log(`❌ 登录失败`)
    console.log(`错误:`, error)
  }
} catch (error) {
  const loginTime = Date.now() - loginStartTime
  console.log(`❌ 登录请求失败 (${loginTime}ms)`)
  console.log(`错误: ${error.message}`)
  console.log(`错误类型: ${error.name}`)
  if (error.cause) {
    console.log(`原因:`, error.cause)
  }
}

console.log('\n📊 结论:')
console.log('=====================================')
console.log('如果以上测试都成功，说明:')
console.log('1. ✅ 国内可以直接访问 Supabase')
console.log('2. ✅ 不需要代理')
console.log('3. ⚠️ 问题出在代理配置或其他地方')
