/**
 * 找出所有有"认识"状态记录的书籍
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

console.log('\n🔍 查找有"认识"状态记录的书籍')
console.log('='.repeat(80))

// 获取有"known"状态的进度记录
const { data: progressData, error } = await supabase
  .from('word_progress')
  .select('book_id, user_id, status')
  .eq('status', 'known')
  .limit(100)

if (error) {
  console.log('❌ 查询失败:', error)
  process.exit(1)
}

console.log(`找到 ${progressData?.length || 0} 条"认识"状态的记录\n`)

if (!progressData || progressData.length === 0) {
  console.log('❌ 没有任何"认识"状态的记录')
  console.log('💡 这就是为什么用户说筛选"失效"!')
  process.exit(0)
}

// 按book_id分组
const bookGroups = {}
progressData.forEach(p => {
  if (!bookGroups[p.book_id]) {
    bookGroups[p.book_id] = []
  }
  bookGroups[p.book_id].push(p.user_id)
})

console.log('📚 有"认识"记录的书籍:')
console.log('-'.repeat(80))

// 获取书籍详情
const bookIds = Object.keys(bookGroups)
const { data: books } = await supabase
  .from('books')
  .select('id, title')
  .in('id', bookIds)

if (books) {
  books.forEach(book => {
    const userCount = new Set(bookGroups[book.id]).size
    const recordCount = bookGroups[book.id].length
    console.log(`📖 ${book.title}`)
    console.log(`   ID: ${book.id}`)
    console.log(`   进度记录数: ${recordCount}`)
    console.log(`   用户数: ${userCount}`)
    console.log('')
  })
}

console.log('='.repeat(80))
console.log(`\n✅ 结论: 找到了 ${books?.length || 0} 本有"认识"记录的书籍`)

// 找出记录最多的书
if (books && books.length > 0) {
  const maxBook = books.reduce((max, book) =>
    bookGroups[book.id].length > bookGroups[max.id].length ? book : max
  )

  console.log(`\n🎯 建议测试书籍: ${maxBook.title}`)
  console.log(`   ID: ${maxBook.id}`)
  console.log(`   "认识"记录数: ${bookGroups[maxBook.id].length}`)
}
