/**
 * 将测试词书分配给测试用户
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 读取 .env.local
function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')

    const envVars = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=').trim()
      const cleanValue = value.replace(/^["']|["']$/g, '')
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

async function assignBookToUser() {
  console.log('🔧 将词书分配给测试用户...\n')

  try {
    // 1. 获取测试用户
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', TEST_USER_PHONE)
      .single()

    if (!user) {
      console.error('❌ 测试用户不存在，请先运行 node create-test-user.mjs')
      return
    }

    console.log('✅ 找到测试用户:', user.id)

    // 2. 更新词书的 created_by 字段
    const { data: book, error: updateError } = await supabase
      .from('books')
      .update({ created_by: user.id })
      .eq('id', TEST_BOOK_ID)
      .select('id, title, total_words, created_by')
      .single()

    if (updateError) {
      console.error('❌ 更新词书失败:', updateError.message)

      // 如果更新失败，尝试将词书设置为官方词书
      console.log('\n尝试将词书设置为官方词书...')
      const { data: book2, error: updateError2 } = await supabase
        .from('books')
        .update({ is_official: true })
        .eq('id', TEST_BOOK_ID)
        .select('id, title, total_words, is_official')
        .single()

      if (updateError2) {
        console.error('❌ 设置为官方词书也失败:', updateError2.message)
        return
      }

      console.log('✅ 词书已设置为官方词书')
      console.log('   Book ID:', book2.id)
      console.log('   Title:', book2.title)
      console.log('   Total Words:', book2.total_words)
    } else {
      console.log('✅ 词书已分配给测试用户')
      console.log('   Book ID:', book.id)
      console.log('   Title:', book.title)
      console.log('   Total Words:', book.total_words)
      console.log('   New Owner:', user.id)
    }

    // 3. 验证测试用户可以访问
    console.log('\n验证访问权限...')

    // 创建测试用户的客户端
    const userSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

    const { data: { session } } = await userSupabase.auth.signInWithPassword({
      email: `${TEST_USER_PHONE}@phone.xiaoyu.com`,
      password: 'password123'
    })

    if (session) {
      await userSupabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      })

      const { data: words, error: wordsError } = await userSupabase
        .from('words')
        .select('id')
        .eq('word_book_id', TEST_BOOK_ID)
        .limit(1)

      if (wordsError) {
        console.error('⚠️  用户仍然无法访问单词:', wordsError.message)
      } else {
        console.log('✅ 测试用户可以访问该词书的单词!')
      }
    }

    console.log('\n🎉 完成! 现在测试用户应该可以访问该词书了')

  } catch (error) {
    console.error('\n❌ 操作失败:', error)
  }
}

assignBookToUser()
