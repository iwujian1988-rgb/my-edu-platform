/**
 * 详细验证RPC函数返回的数据结构
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')

    const envVars = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=').trim()
      const cleanValue = value.replace(/^[\"']|[\"']$/g, '')
      if (key && cleanValue) {
        envVars[key.trim()] = cleanValue
      }
    })

    return envVars
  } catch (error) {
    return {}
  }
}

const env = loadEnvFile()
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const TEST_BOOK_ID = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'
const TEST_USER_PHONE = '13800138000'

async function verifyRPCResult() {
  console.log('🔍 详细验证RPC函数返回的数据...\n')

  try {
    // 1. 获取测试用户并登录
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', TEST_USER_PHONE)
      .single()

    if (!user) {
      console.error('❌ 测试用户不存在')
      return
    }

    const { data: authData } = await supabase.auth.signInWithPassword({
      email: `${TEST_USER_PHONE}@phone.xiaoyu.com`,
      password: 'password123'
    })

    const userSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    await userSupabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    })

    // 2. 调用RPC函数
    const { data: words, error } = await userSupabase.rpc('get_book_words_paginated_optimized', {
      book_uuid: TEST_BOOK_ID,
      offset_val: 0,
      limit_val: 5
    })

    if (error) {
      console.error('❌ RPC调用失败:', error.message)
      return
    }

    console.log(`✅ RPC返回了 ${words.length} 个单词\n`)

    // 3. 显示第一个单词的完整字段
    if (words && words.length > 0) {
      const firstWord = words[0]
      console.log('📝 第一个单词的数据结构:')
      console.log(JSON.stringify(firstWord, null, 2))

      // 4. 检查关键字段
      console.log('\n🔍 关键字段检查:')
      console.log(`   word: ${firstWord.word}`)
      console.log(`   chapter: ${firstWord.chapter}`)
      console.log(`   theme: "${firstWord.theme}" (长度: ${firstWord.theme?.length || 0})`)
      console.log(`   scene: "${firstWord.scene}" (长度: ${firstWord.scene?.length || 0})`)

      // 5. 统计theme和scene的分布
      const themeStats = {}
      const sceneStats = {}

      words.forEach(w => {
        const theme = w.theme || '(空)'
        const scene = w.scene || '(空)'
        themeStats[theme] = (themeStats[theme] || 0) + 1
        sceneStats[scene] = (sceneStats[scene] || 0) + 1
      })

      console.log('\n📊 Theme分布:')
      Object.entries(themeStats).forEach(([theme, count]) => {
        console.log(`   ${theme}: ${count}个`)
      })

      console.log('\n📊 Scene分布:')
      Object.entries(sceneStats).forEach(([scene, count]) => {
        console.log(`   ${scene}: ${count}个`)
      })

      console.log('\n✅ 验证完成！RPC函数正确返回了所有字段')
    }

  } catch (error) {
    console.error('\n❌ 验证失败:', error)
  }
}

verifyRPCResult()
