import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 读取环境变量
let supabaseUrl, supabaseKey
try {
  const envContent = readFileSync(join(__dirname, '.env.local'), 'utf-8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '')
    if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value
    if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = value
  })
} catch (error) {
  console.error('❌ 无法读取 .env.local 文件')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAPILogic() {
  // 查找用户
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('phone_number', '15652936305')
    .single()

  if (!users) {
    console.log('❌ 用户不存在')
    return
  }

  console.log('✅ 用户ID:', users.id)

  // 模拟 API 查询
  const { data: recentPrefs } = await supabase
    .from('user_book_preferences')
    .select('book_id, last_accessed_at, last_resume_state')
    .eq('user_id', users.id)
    .not('last_accessed_at', 'is', null)
    .order('last_accessed_at', { ascending: false })
    .limit(3)

  console.log('\n📚 查询到的 book_ids:')
  recentPrefs?.forEach((pref, i) => {
    console.log(`  ${i+1}. ${pref.book_id}`)
  })

  const bookIds = recentPrefs?.map(p => p.book_id)
  const { data: booksData } = await supabase
    .from('books')
    .select('id, title, description, total_words')
    .in('id', bookIds)

  console.log(`\n📖 查询到的书籍数量: ${booksData?.length || 0}`)
  console.log('书籍详情:')
  booksData?.forEach(book => {
    console.log(`  - ${book.id}: ${book.title} (${book.total_words} words)`)
  })

  // 检查是否有未匹配的书籍
  const foundIds = new Set(booksData?.map(b => b.id) || [])
  const missingIds = bookIds?.filter(id => !foundIds.has(id))
  if (missingIds && missingIds.length > 0) {
    console.log('\n⚠️ 未找到的书籍ID:')
    missingIds.forEach(id => console.log(`  - ${id}`))
  }
}

testAPILogic()
