/**
 * 直接测试words API
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
      const cleanValue = value.replace(/^[\\"']|[\\"']$/g, '')
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

const TEST_USER = {
  phone: '13800138000',
  password: 'password123'
}

const TEST_BOOK_ID = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'

async function testWordsAPI() {
  console.log('🔍 测试words API...\n')

  try {
    // 1. 登录
    console.log('1️⃣ 登录...')
    const email = `${TEST_USER.phone}@phone.xiaoyu.com`

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: TEST_USER.password
    })

    if (authError || !authData?.user) {
      console.log('❌ 登录失败:', authError?.message)
      return
    }

    console.log('✅ 登录成功')
    console.log('   User ID:', authData.user.id)

    // 2. 创建带有session的client
    const userSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    await userSupabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    })

    // 3. 调用words API
    console.log('\n2️⃣ 调用words API...')
    console.log('   URL:', `http://localhost:3000/api/words?bookId=${TEST_BOOK_ID}&page=1&pageSize=50`)

    const response = await fetch(`http://localhost:3000/api/words?bookId=${TEST_BOOK_ID}&page=1&pageSize=50`, {
      headers: {
        'Cookie': `sb-access-token=${authData.session.access_token}; sb-refresh-token=${authData.session.refresh_token}`
      }
    })

    console.log('   Status:', response.status)

    if (!response.ok) {
      const text = await response.text()
      console.log('❌ API调用失败')
      console.log('   Response:', text)
      return
    }

    const data = await response.json()

    console.log('\n3️⃣ API响应:')
    console.log('   单词数量:', data.words?.length || 0)

    if (data.words && data.words.length > 0) {
      console.log('   第一个单词:', {
        word: data.words[0].word,
        chapter: data.words[0].chapter,
        theme: data.words[0].theme,
        scene: data.words[0].scene
      })
    }

    console.log('\n✅ 测试完成')

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
  }
}

testWordsAPI()
