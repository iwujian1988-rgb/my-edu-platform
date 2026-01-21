/**
 * 检查特定书籍的数据和进度
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

const bookId = '9f1e6332-979d-4632-a8f6-8bd35246b28d'

console.log('\n🔍 检查特定书籍:', bookId)
console.log('='.repeat(80))

// 1. 获取书籍信息
console.log('\n1. 书籍信息:')
const { data: book } = await supabase
  .from('books')
  .select('*')
  .eq('id', bookId)
  .single()

if (book) {
  console.log(`✅ 书名: ${book.title}`)
  console.log(`   总单词数: ${book.total_words}`)
} else {
  console.log('❌ 书籍不存在')
  process.exit(1)
}

// 2. 获取所有用户
console.log('\n2. 检查所有用户的进度:')
const { data: { users } } = await supabase.auth.admin.listUsers()

if (!users || users.length === 0) {
  console.log('❌ 没有用户')
  process.exit(1)
}

console.log(`总用户数: ${users.length}`)

// 3. 检查每个用户的进度
for (const user of users.slice(0, 5)) {
  console.log(`\n用户: ${user.email}`)

  const { data: progress } = await supabase
    .from('word_progress')
    .select('word_id, status')
    .eq('user_id', user.id)
    .eq('book_id', bookId)

  if (progress && progress.length > 0) {
    console.log(`  进度记录: ${progress.length} 条`)

    // 统计各状态
    const counts = {}
    progress.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1
    })

    console.log('  状态分布:', counts)

    if (counts.known > 0) {
      console.log(`  ✅ 这个用户有 ${counts.known} 个标记为"认识"的单词`)

      // 测试API：调用/api/words?status=known
      console.log('\n3. 测试API调用...')

      // 模拟API调用
      const { data: words } = await supabase
        .from('words')
        .select('id')
        .eq('book_id', bookId)
        .limit(5)

      if (words) {
        console.log(`  ✅ 该书有单词`)
        console.log(`  💡 可以测试: /api/words?bookId=${bookId}&status=known`)
      }
    }
  } else {
    console.log('  无进度记录')
  }
}

console.log('\n' + '='.repeat(80))
