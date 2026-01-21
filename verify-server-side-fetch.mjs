/**
 * 验证服务端数据获取功能
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

const TEST_USER_PHONE = '13800138000'
const TEST_BOOK_ID = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'

async function testServerSideFetch() {
  console.log('🔍 测试服务端数据获取功能\n')
  console.log('='.repeat(60))

  try {
    // 1. 获取用户
    console.log('\n1️⃣ 获取用户...')
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', TEST_USER_PHONE)
      .single()

    if (!user) {
      console.log('❌ 用户不存在')
      return
    }

    console.log('✅ 用户存在')
    console.log('   ID:', user.id)
    console.log('   book_permissions:', user.book_permissions)

    // 2. 检查book
    console.log('\n2️⃣ 检查book...')
    const { data: book } = await supabase
      .from('books')
      .select('*')
      .eq('id', TEST_BOOK_ID)
      .single()

    if (!book) {
      console.log('❌ Book不存在')
      return
    }

    console.log('✅ Book存在')
    console.log('   Title:', book.title)
    console.log('   is_official:', book.is_official)
    console.log('   total_words:', book.total_words)

    // 3. 模拟服务端获取单词（使用RPC）
    console.log('\n3️⃣ 使用RPC获取单词...')
    const { data: words, error } = await supabase.rpc('get_book_words_paginated_optimized', {
      book_uuid: TEST_BOOK_ID,
      offset_val: 0,
      limit_val: 21
    })

    if (error) {
      console.log('❌ RPC调用失败:', error.message)
      return
    }

    console.log(`✅ RPC成功，返回 ${words?.length || 0} 个单词`)

    if (words && words.length > 0) {
      console.log('\n4️⃣ 单词示例（前5个）:')
      words.slice(0, 5).forEach((word, i) => {
        console.log(`   ${i + 1}. ${word.word}`)
        console.log(`      章节: ${word.chapter || '(无)'}`)
        console.log(`      主题: ${word.theme || '(无)'}`)
        console.log(`      场景: ${word.scene || '(无)'}`)
      })

      console.log(`\n✅ 验证成功！服务端可以正常获取 ${words.length} 个单词`)
      console.log('✅ 这意味着服务端数据传递方案应该可以正常工作')
    } else {
      console.log('\n⚠️  RPC返回了空数组')
      console.log('   需要检查数据库是否有单词数据')
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ 服务端数据获取功能验证完成')

  } catch (error) {
    console.error('\n❌ 验证失败:', error.message)
  }
}

testServerSideFetch()
