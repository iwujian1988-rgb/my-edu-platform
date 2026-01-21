/**
 * 测试API是否返回hasThemeData和hasSceneData
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

console.log('\n🧪 测试API返回hasThemeData和hasSceneData\n')

// 登录
console.log('1. 登录测试用户...')
const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'test123456'
})

if (loginError || !user) {
  console.log('❌ 登录失败:', loginError?.message || '未知错误')
  process.exit(1)
}

console.log('✅ 登录成功')

// 获取一本书
const { data: books } = await supabase
  .from('books')
  .select('id, title')
  .limit(1)

if (!books || books.length === 0) {
  console.log('❌ 没有找到书籍')
  await supabase.auth.signOut()
  process.exit(1)
}

const bookId = books[0].id
console.log(`✅ 使用书籍: ${books[0].title} (${bookId})`)

// 调用API
console.log('\n2. 调用 /api/words API...')
const session = await supabase.auth.getSession()
const response = await fetch(`http://localhost:3000/api/words?bookId=${bookId}&page=1&pageSize=5`, {
  headers: {
    'Authorization': `Bearer ${session.data.session?.access_token}`,
    'Content-Type': 'application/json'
  }
})

if (!response.ok) {
  console.log(`❌ API请求失败: ${response.status}`)
  const text = await response.text()
  console.log('错误:', text)
  await supabase.auth.signOut()
  process.exit(1)
}

const result = await response.json()

console.log('✅ API响应成功')
console.log('\n3. 检查返回字段:')
console.log(`   - success: ${result.success ? '✅' : '❌'}`)
console.log(`   - data: ${result.data?.length || 0} 个单词`)
console.log(`   - hasThemeData: ${result.hasThemeData !== undefined ? result.hasThemeData + ' ✅' : '❌ 字段缺失'}`)
console.log(`   - hasSceneData: ${result.hasSceneData !== undefined ? result.hasSceneData + ' ✅' : '❌ 字段缺失'}`)

// 检查单词是否有theme和scene字段
if (result.data && result.data.length > 0) {
  const firstWord = result.data[0]
  console.log('\n4. 检查单词字段:')
  console.log(`   - theme: ${firstWord.theme !== undefined ? '✅ 存在' : '❌ 不存在'}`)
  console.log(`   - scene: ${firstWord.scene !== undefined ? '✅ 存在' : '❌ 不存在'}`)
  console.log(`   - chapter_id: ${firstWord.chapter_id ? '✅ 存在' : '❌ 不存在'}`)

  if (firstWord.theme !== undefined) {
    console.log(`   theme值: "${firstWord.theme}"`)
  }
  if (firstWord.scene !== undefined) {
    console.log(`   scene值: "${firstWord.scene}"`)
  }
}

console.log('\n5. 总结:')
if (result.hasThemeData === false && result.hasSceneData === false) {
  console.log('   ✅ API正确返回: hasThemeData=false, hasSceneData=false')
  console.log('   ✅ 前端应该隐藏主题和场景筛选按钮')
} else if (result.hasThemeData === true || result.hasSceneData === true) {
  console.log('   ✅ API返回: 书籍有theme/scene数据')
  console.log('   ✅ 前端应该显示主题和场景筛选按钮')
} else {
  console.log('   ❌ API返回字段异常')
}

console.log('\n✅ 测试完成\n')

await supabase.auth.signOut()
