/**
 * 检查测试用户是否存在并测试登录
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
  phone: '15652936305',
  password: 'wj5236016'
}

async function checkTestUser() {
  console.log('🔍 检查测试用户...\n')

  try {
    // 1. 检查用户是否存在
    console.log('1️⃣ 检查用户是否存在...')
    const email = `${TEST_USER.phone}@phone.xiaoyu.com`

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', TEST_USER.phone)
      .single()

    if (userError || !user) {
      console.log('   ❌ 用户不存在')
      console.log('   📝 需要先创建测试用户')
      return
    }

    console.log('   ✅ 用户存在')
    console.log('   用户ID:', user.id)
    console.log('   手机号:', user.phone_number)

    // 2. 尝试登录
    console.log('\n2️⃣ 尝试登录...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: TEST_USER.password
    })

    if (authError) {
      console.log('   ❌ 登录失败:', authError.message)
      return
    }

    if (!authData.user || !authData.session) {
      console.log('   ❌ 登录失败：未返回session')
      return
    }

    console.log('   ✅ 登录成功')
    console.log('   Access Token (前50字符):', authData.session.access_token.substring(0, 50) + '...')

    // 3. 检查用户是否有权限访问测试book
    const testBookId = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'

    console.log('\n3️⃣ 检查用户是否有权限访问测试book...')
    const { data: bookAccess, error: accessError } = await supabase
      .from('user_book_permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', testBookId)
      .single()

    if (accessError || !bookAccess) {
      console.log('   ❌ 用户没有权限访问测试book')
      console.log('   📝 需要给用户分配权限')
    } else {
      console.log('   ✅ 用户有权限访问测试book')
      console.log('   权限:', bookAccess.permissions)
    }

    // 4. 检查所有可访问的词库
    console.log('\n4️⃣ 检查用户可访问的所有词库...')
    const { data: allBooks, error: allBooksError } = await supabase
      .from('user_book_permissions')
      .select('book_id, books(title, id)')
      .eq('user_id', user.id)

    if (allBooksError) {
      console.log('   ❌ 查询失败:', allBooksError.message)
    } else {
      console.log(`   ✅ 用户可访问 ${allBooks?.length || 0} 个词库`)
      allBooks?.forEach((book, i) => {
        console.log(`      ${i + 1}. ${book.books?.title || book.book_id}`)
      })
    }

    console.log('\n✅ 测试用户检查完成！')

  } catch (error) {
    console.error('\n❌ 检查失败:', error)
  }
}

checkTestUser()
