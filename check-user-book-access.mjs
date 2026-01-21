/**
 * 检查测试用户对词书的访问权限
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 手动读取 .env.local 文件
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
    console.error('⚠️  无法读取 .env.local 文件:', error.message)
    return {}
  }
}

const env = loadEnvFile()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const TEST_USER_PHONE = '13800138000'
const TEST_BOOK_ID = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'

async function checkUserBookAccess() {
  console.log('🔍 检查测试用户对词书的访问权限...\n')

  try {
    // 1. 查找测试用户
    console.log('1️⃣ 查找测试用户...')
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, phone_number, full_name')
      .eq('phone_number', TEST_USER_PHONE)
      .single()

    if (userError || !user) {
      console.error('❌ 测试用户不存在:', userError?.message)
      return
    }

    console.log('✅ 找到测试用户:', user.full_name)
    console.log('   User ID:', user.id)
    console.log('   Phone:', user.phone_number)

    // 2. 查找词书
    console.log('\n2️⃣ 查找词书...')
    const { data: book, error: bookError } = await supabase
      .from('word_books')
      .select('id, title, total_words, is_official, created_by')
      .eq('id', TEST_BOOK_ID)
      .single()

    if (bookError || !book) {
      console.error('❌ 词书不存在:', bookError?.message)
      return
    }

    console.log('✅ 找到词书:', book.title)
    console.log('   Book ID:', book.id)
    console.log('   Total Words:', book.total_words)
    console.log('   Is Official:', book.is_official)
    console.log('   Created By:', book.created_by)

    // 3. 检查词书是否是官方词书或用户创建的
    console.log('\n3️⃣ 检查访问权限...')

    const hasAccess = book.is_official || book.created_by === user.id

    if (hasAccess) {
      console.log('✅ 用户有访问权限')
      console.log('   Reason:', book.is_official ? '官方词书' : '用户创建的词书')
    } else {
      console.log('⚠️  用户可能没有直接访问权限')
      console.log('   词书创建者:', book.created_by)
      console.log('   当前用户:', user.id)
    }

    // 4. 检查该词书的单词数量
    console.log('\n4️⃣ 检查单词数据...')
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('id', { count: 'exact', head: false })
      .eq('word_book_id', TEST_BOOK_ID)

    if (wordsError) {
      console.error('❌ 无法查询单词:', wordsError.message)
    } else {
      console.log('✅ 该词书共有', words.length, '个单词')
    }

    // 5. 尝试使用测试用户的身份获取单词
    console.log('\n5️⃣ 测试用户身份访问...')

    // 创建测试用户的客户端
    const userSupabase = createClient(supabaseUrl, supabaseServiceKey)

    // 模拟用户登录
    const { data: { session } } = await userSupabase.auth.signInWithPassword({
      email: `${TEST_USER_PHONE}@phone.xiaoyu.com`,
      password: 'password123'
    })

    if (!session) {
      console.error('❌ 无法以测试用户身份登录')
      return
    }

    // 设置用户的 session
    await userSupabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    })

    // 尝试获取单词
    const { data: userWords, error: userWordsError } = await userSupabase
      .from('words')
      .select('id')
      .eq('word_book_id', TEST_BOOK_ID)
      .limit(10)

    if (userWordsError) {
      console.error('❌ 用户无法访问该词书的单词:', userWordsError.message)
      console.log('   错误代码:', userWordsError.code)
      console.log('   错误详情:', userWordsError.details)

      // 检查是否是权限问题
      if (userWordsError.code === '42501' || userWordsError.message.includes('permission')) {
        console.log('\n💡 建议修复:')
        console.log('   1. 将词书设置为官方词书')
        console.log('   2. 或将词书创建者更改为测试用户')
        console.log('   3. 或调整 RLS 策略')
      }
    } else {
      console.log('✅ 用户可以访问该词书的单词')
      console.log('   查询到', userWords.length, '个单词 (限制10个)')
    }

    // 6. 检查是否有其他用户创建的公开词书
    console.log('\n6️⃣ 查找其他可用的测试词书...')
    const { data: otherBooks, error: otherBooksError } = await supabase
      .from('word_books')
      .select('id, title, total_words, is_official')
      .or('is_official.eq.true,total_words.gte.100')
      .limit(5)

    if (!otherBooksError && otherBooks && otherBooks.length > 0) {
      console.log('✅ 找到其他可用词书:')
      otherBooks.forEach((b, index) => {
        console.log(`   ${index + 1}. ${b.title} (${b.total_words} 单词)`)
        console.log('      ID:', b.id)
        console.log('      Official:', b.is_official)
      })
    }

  } catch (error) {
    console.error('\n❌ 检查过程出错:', error)
  }
}

checkUserBookAccess()
