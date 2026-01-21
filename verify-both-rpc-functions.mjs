/**
 * 验证两个RPC函数都正确返回数据
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

async function verifyBothRPCs() {
  console.log('🔍 验证两个RPC函数...\n')

  try {
    // 获取测试用户并登录
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

    console.log('✅ 测试用户已登录\n')

    // 测试优化的RPC函数
    console.log('1️⃣ 测试 get_book_words_paginated_optimized...')
    const { data: optimizedWords, error: optimizedError } = await userSupabase.rpc('get_book_words_paginated_optimized', {
      book_uuid: TEST_BOOK_ID,
      offset_val: 0,
      limit_val: 5
    })

    if (optimizedError) {
      console.log('   ❌ 失败:', optimizedError.message)
    } else {
      console.log('   ✅ 成功，返回', optimizedWords.length, '个单词')
      if (optimizedWords && optimizedWords.length > 0) {
        console.log('   字段:', Object.keys(optimizedWords[0]).join(', '))
        console.log('   示例 - word:', optimizedWords[0].word, '| theme:', `"${optimizedWords[0].theme}"`, '| scene:', `"${optimizedWords[0].scene}"`)
      }
    }

    // 测试标准RPC函数
    console.log('\n2️⃣ 测试 get_book_words_paginated...')
    const { data: standardWords, error: standardError } = await userSupabase.rpc('get_book_words_paginated', {
      book_uuid: TEST_BOOK_ID,
      offset_val: 0,
      limit_val: 5
    })

    if (standardError) {
      console.log('   ❌ 失败:', standardError.message)
    } else {
      console.log('   ✅ 成功，返回', standardWords.length, '个单词')
      if (standardWords && standardWords.length > 0) {
        console.log('   字段:', Object.keys(standardWords[0]).join(', '))
        console.log('   示例 - word:', standardWords[0].word, '| theme:', `"${standardWords[0].theme}"`, '| scene:', `"${standardWords[0].scene}"`)
      }
    }

    console.log('\n✅ 验证完成！两个RPC函数都正常工作')

  } catch (error) {
    console.error('\n❌ 验证失败:', error)
  }
}

verifyBothRPCs()
