/**
 * 检查测试book的详细信息和权限
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
  phone: '13800138000'
}

const TEST_BOOK_ID = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'

async function checkBookDetails() {
  console.log('🔍 检查测试book的详细信息...\n')

  try {
    // 1. 获取用户ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, book_permissions')
      .eq('phone_number', TEST_USER.phone)
      .single()

    if (userError || !user) {
      console.log('❌ 用户不存在')
      return
    }

    console.log('✅ 用户信息:')
    console.log('   ID:', user.id)
    console.log('   book_permissions:', user.book_permissions)

    // 2. 获取book详细信息
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', TEST_BOOK_ID)
      .single()

    if (bookError || !book) {
      console.log('\n❌ Book不存在')
      console.log('   Error:', bookError)
      return
    }

    console.log('\n✅ Book信息:')
    console.log('   ID:', book.id)
    console.log('   Title:', book.title)
    console.log('   is_official:', book.is_official)
    console.log('   created_by:', book.created_by)
    console.log('   total_words:', book.total_words)

    // 3. 检查权限匹配
    console.log('\n🔍 权限分析:')

    if (book.is_official === false) {
      console.log('   这是一个自定义词库')

      if (book.created_by === user.id) {
        console.log('   ✅ 用户是创建者，有权限访问')
      } else {
        console.log('   ❌ 用户不是创建者，无权限访问')
        console.log('   📝 需要将created_by改为用户ID，或将is_official设为true')
      }
    } else {
      console.log('   这是一个官方词库')
      console.log('   book_permissions:', user.book_permissions)

      if (user.book_permissions && user.book_permissions.includes('*')) {
        console.log('   ✅ 用户有"*"权限，可以访问所有官方词库')
      } else {
        console.log('   ⚠️ 用户没有"*"权限，可能无法访问')
      }
    }

    // 4. 检查这个book有多少单词
    const { count, error: countError } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', TEST_BOOK_ID)

    if (countError) {
      console.log('\n❌ 无法统计单词数:', countError)
    } else {
      console.log('\n📊 单词统计:')
      console.log('   总单词数:', count)
    }

  } catch (error) {
    console.error('\n❌ 操作失败:', error)
  }
}

checkBookDetails()
