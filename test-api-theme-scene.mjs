/**
 * 测试 API 是否正确返回 theme 和 scene 字段
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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

console.log('\n🧪 测试 API 返回的单词数据\n')

// 获取一个测试用户和书籍
console.log('1. 获取用户和书籍...')
const { data: { user } } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'test123456'
})

if (!user) {
  console.log('❌ 无法登录测试用户')
  process.exit(1)
}

console.log('✅ 用户登录成功:', user.id)

// 获取一本书
const { data: books } = await supabase
  .from('books')
  .select('id')
  .limit(1)

if (!books || books.length === 0) {
  console.log('❌ 没有找到书籍')
  process.exit(1)
}

const bookId = books[0].id
console.log('✅ 使用书籍:', bookId)

// 调用 API
console.log('\n2. 调用 /api/words?bookId=xxx&page=1&pageSize=5')
const response = await fetch(`http://localhost:3000/api/words?bookId=${bookId}&page=1&pageSize=5`, {
  headers: {
    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    'Content-Type': 'application/json'
  }
})

if (!response.ok) {
  console.log('❌ API 请求失败:', response.status)
  const text = await response.text()
  console.log('错误信息:', text)
  process.exit(1)
}

const result = await response.json()

console.log('✅ API 响应成功')
console.log('   返回单词数:', result.data?.length || 0)

if (result.data && result.data.length > 0) {
  const firstWord = result.data[0]
  console.log('\n3. 检查第一个单词的字段:')
  console.log('   所有字段:', Object.keys(firstWord).join(', '))
  console.log(`   - id: ${firstWord.id ? '✅' : '❌'}`)
  console.log(`   - word: ${firstWord.word ? '✅' : '❌'}`)
  console.log(`   - theme: ${firstWord.theme !== undefined ? '✅ 存在' : '❌ 不存在'}`)
  console.log(`   - scene: ${firstWord.scene !== undefined ? '✅ 存在' : '❌ 不存在'}`)
  console.log(`   - chapter_id: ${firstWord.chapter_id ? '✅' : '❌'}`)

  if (firstWord.theme !== undefined) {
    console.log(`   theme 值: "${firstWord.theme}"`)
  }
  if (firstWord.scene !== undefined) {
    console.log(`   scene 值: "${firstWord.scene}"`)
  }

  // 检查所有单词
  const wordsWithTheme = result.data.filter((w: any) => w.theme !== undefined && w.theme !== null)
  const wordsWithScene = result.data.filter((w: any) => w.scene !== undefined && w.scene !== null)

  console.log('\n4. 统计:')
  console.log(`   有 theme 的单词: ${wordsWithTheme.length}/${result.data.length}`)
  console.log(`   有 scene 的单词: ${wordsWithScene.length}/${result.data.length}`)

  if (wordsWithTheme.length > 0) {
    console.log('   ✅ theme 字段存在')
  } else {
    console.log('   ⚠️  theme 字段为 null（可能章节没有设置 theme）')
  }

  if (wordsWithScene.length > 0) {
    console.log('   ✅ scene 字段存在')
  } else {
    console.log('   ⚠️  scene 字段为 null（可能章节没有设置 scene）')
  }
}

console.log('\n✅ 测试完成\n')

await supabase.auth.signOut()
