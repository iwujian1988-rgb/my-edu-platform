/**
 * 真正测试：直接调用API看看状态筛选是否工作
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envContent = readFileSync(join(__dirname, '.env.local'), 'utf-8')
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('='))
    .map(([key, ...valueParts]) => [key, valueParts.join('=').replace(/"/g, '')])
)

console.log('\n🔬 真实测试：直接调用API测试状态筛选\n')
console.log('='.repeat(80))

// 获取测试用户和书籍
const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// 1. 登录
console.log('1. 登录测试用户...')
const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'test123456'
})

let testUser
if (loginError || !user) {
  console.log('❌ 登录失败，尝试其他用户...')

  // 获取第一个用户
  const { data: { users } } = await supabase.auth.admin.listUsers()
  if (!users || users.length === 0) {
    console.log('❌ 没有用户')
    process.exit(1)
  }

  console.log(`✅ 使用用户: ${users[0].email}`)
  testUser = users[0]
} else {
  console.log(`✅ 登录成功: ${user.email}`)
  testUser = user
}

// 2. 获取书籍
console.log('\n2. 获取测试书籍...')
const { data: books } = await supabase
  .from('books')
  .select('id, title')
  .limit(1)

if (!books || books.length === 0) {
  console.log('❌ 没有书籍')
  process.exit(1)
}

const testBook = books[0]
console.log(`✅ 使用书籍: ${testBook.title}`)

// 3. 检查是否有进度数据
console.log('\n3. 检查word_progress数据...')
const { data: progressData } = await supabase
  .from('word_progress')
  .select('word_id, status')
  .eq('user_id', testUser.id)
  .eq('book_id', testBook.id)

console.log(`找到 ${progressData?.length || 0} 条进度记录`)

if (!progressData || progressData.length === 0) {
  console.log('⚠️ 没有进度数据，创建测试数据...')

  // 获取一些单词
  const { data: words } = await supabase
    .from('words')
    .select('id')
    .eq('book_id', testBook.id)
    .limit(5)

  if (words && words.length > 0) {
    // 创建测试进度数据
    const testProgress = [
      { word_id: words[0].id, status: 'known' },
      { word_id: words[1]?.id, status: 'fuzzy' },
      { word_id: words[2]?.id, status: 'unknown' },
    ].filter(p => p.word_id)

    const { error: insertError } = await supabase
      .from('word_progress')
      .insert(testProgress.map(p => ({
        user_id: testUser.id,
        book_id: testBook.id,
        word_id: p.word_id,
        status: p.status
      })))

    if (insertError) {
      console.log(`❌ 创建测试数据失败: ${insertError.message}`)
    } else {
      console.log(`✅ 创建了 ${testProgress.length} 条测试进度数据`)
    }
  }
}

// 4. 真正调用API测试
console.log('\n4. 调用API测试不同状态...')

const session = await supabase.auth.getSession()
const token = session.data.session?.access_token

const testStatus = async (status: string) => {
  const url = `http://localhost:3000/api/words?bookId=${testBook.id}&page=1&pageSize=10&status=${status}`
  console.log(`\n测试: ${status}`)
  console.log(`URL: ${url}`)

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log(`状态码: ${response.status}`)

    if (!response.ok) {
      const text = await response.text()
      console.log(`❌ 错误: ${text}`)
      return null
    }

    const result = await response.json()
    console.log(`✅ 返回 ${result.data?.length || 0} 个单词`)

    if (result.data && result.data.length > 0) {
      const firstWord = result.data[0]
      console.log(`第一个单词:`, {
        id: firstWord.id,
        word: firstWord.word,
        status: firstWord.status
      })
    }

    return result
  } catch (error) {
    console.log(`❌ 异常: ${error.message}`)
    return null
  }
}

// 测试各个状态
await testStatus('all')
await testStatus('known')
await testStatus('fuzzy')
await testStatus('unknown')
await testStatus('new')

console.log('\n' + '='.repeat(80))
console.log('测试完成')
console.log('='.repeat(80) + '\n')
