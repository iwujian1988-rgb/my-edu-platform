// 删除空书籍（测试失败留下的）
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load .env file
const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (valueParts.length > 0) {
      let value = valueParts.join('=').trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (key && value) {
        process.env[key.trim()] = value
      }
    }
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanupEmptyBooks() {
  console.log('\n🧹 清理空书籍...\n')

  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, total_words, total_chapters')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ 查询失败:', error.message)
    return
  }

  const emptyBooks = books.filter(b => (b.total_words || 0) === 0)

  console.log(`找到 ${emptyBooks.length} 个空书籍:\n`)

  for (const book of emptyBooks) {
    console.log(`删除: ${book.title} (ID: ${book.id})`)
    await supabase.from('books').delete().eq('id', book.id)
  }

  console.log(`\n✅ 清理完成!\n`)
}

cleanupEmptyBooks().catch(console.error)
