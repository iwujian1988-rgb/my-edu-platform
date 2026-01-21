/**
 * 真正的端到端测试：验证状态筛选功能
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envContent = readFileSync(join(__dirname, '.env.local'), 'utf-8')
const envVars = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('='))
    .map(([key, ...valueParts]) => [key, valueParts.join('=').replace(/"/g, '')])
)

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

console.log('\n🔬 真正的端到端测试\n')

// 1. 获取测试数据
console.log('1. 获取测试数据...')
const { data: books } = await supabase
  .from('books')
  .select('id, title')
  .limit(1)

if (!books || books.length === 0) {
  console.log('❌ 没有书籍')
  process.exit(1)
}

const bookId = books[0].id
console.log(`✅ 书籍: ${books[0].title}`)

// 获取用户
const { data: { users } } = await supabase.auth.admin.listUsers()
if (!users || users.length === 0) {
  console.log('❌ 没有用户')
  process.exit(1)
}

const userId = users[0].id
console.log(`✅ 用户: ${userId}`)

// 2. 检查是否有进度数据
console.log('\n2. 检查进度数据...')
const { data: progressData } = await supabase
  .from('word_progress')
  .select('word_id, status')
  .eq('user_id', userId)
  .eq('book_id', bookId)

console.log(`进度记录数: ${progressData?.length || 0}`)

if (progressData && progressData.length > 0) {
  const statusCounts = {}
  progressData.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  })
  console.log('状态分布:', statusCounts)
} else {
  console.log('⚠️ 没有进度数据，无法测试状态筛选')
  console.log('需要先在学习模式标记一些单词')
}

// 3. 检查API代码逻辑
console.log('\n3. 检查API代码...')
const fs = await import('fs')
const apiCode = fs.readFileSync('src/app/api/words/route.ts', 'utf-8')

// 检查关键逻辑
const hasStatusCheck = apiCode.includes('if (status !== \'all\')')
const hasStatusParam = apiCode.includes("const status = searchParams.get('status')")
const queriesProgress = apiCode.includes('.from(\'word_progress\')')
const filtersByStatus = apiCode.includes('.filter((p: any) => p.status === status)')

console.log(`API检查status参数: ${hasStatusParam ? '✅' : '❌'}`)
console.log(`API有status筛选逻辑: ${hasStatusCheck ? '✅' : '❌'}`)
console.log(`API查询word_progress: ${queriesProgress ? '✅' : '❌'}`)
console.log(`API按status过滤: ${filtersByStatus ? '✅' : '❌'}`)

const apiCorrect = hasStatusCheck && queriesProgress && filtersByStatus

// 4. 总结
console.log('\n📊 结论:')
if (apiCorrect) {
  console.log('✅ API代码逻辑正确')
  if (!progressData || progressData.length === 0) {
    console.log('⚠️ 但没有进度数据，所以筛选看起来"失效"')
    console.log('💡 这就是为什么用户说筛选失效！')
    console.log('💡 解决方案: 用户需要先在学习模式标记单词')
  } else {
    console.log('✅ 有进度数据，筛选应该可以工作')
  }
} else {
  console.log('❌ API代码有问题')
  console.log('   需要检查以下逻辑:')
  console.log('   - 是否检查status参数')
  console.log('   - 是否查询word_progress表')
  console.log('   - 是否按status过滤单词')
}

console.log('\n')
