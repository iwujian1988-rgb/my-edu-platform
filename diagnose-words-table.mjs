import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env.local file manually
function loadEnv() {
  try {
    const envContent = readFileSync('.env.local', 'utf-8')
    const lines = envContent.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        let value = valueParts.join('=').trim()
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (key && value) {
          process.env[key] = value
        }
      }
    }
  } catch (error) {
    console.error('Failed to load .env.local:', error.message)
  }
}

loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function diagnoseWordsTable() {
  console.log('🔍 诊断 words 表...\n')

  // 1. 表中单词总数
  const { count: totalWords } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 words 表总记录数: ${totalWords}\n`)

  // 2. 按词书分组统计
  const { data: wordsByBook, error: groupError } = await supabase
    .from('words')
    .select('book_id')

  if (groupError) {
    console.log('❌ 查询失败:', groupError)
    return
  }

  // 统计每个 book_id 的单词数
  const bookWordCounts = {}
  wordsByBook.forEach(w => {
    bookWordCounts[w.book_id] = (bookWordCounts[w.book_id] || 0) + 1
  })

  console.log('📚 各词书的单词数:')
  Object.entries(bookWordCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([bookId, count]) => {
      console.log(`   ${bookId}: ${count} 个单词`)
    })
  console.log('')

  // 3. 获取有数据的词书信息
  const bookIds = Object.keys(bookWordCounts)
  if (bookIds.length > 0) {
    const { data: books } = await supabase
      .from('books')
      .select('id, title')
      .in('id', bookIds)

    console.log('✅ 有单词数据的词书:')
    books.forEach(book => {
      console.log(`   - ${book.title} (${bookWordCounts[book.id]} 个单词)`)
    })
  }

  // 4. 检查最近10条单词记录
  console.log('\n📝 最近10条单词记录:')
  const { data: recentWords } = await supabase
    .from('words')
    .select('id, book_id, word, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  recentWords.forEach((w, i) => {
    const date = w.created_at ? new Date(w.created_at).toISOString().substring(0, 19) : 'unknown'
    console.log(`   ${i + 1}. ${w.word} (book_id: ${w.book_id.substring(0, 8)}..., created: ${date})`)
  })

  // 5. 检查是否有孤立记录（book_id 不存在于 books 表）
  console.log('\n🔍 检查孤立记录...')
  const { data: allBooks } = await supabase
    .from('books')
    .select('id')

  const validBookIds = new Set(allBooks.map(b => b.id))
  const orphanedCount = wordsByBook.filter(w => !validBookIds.has(w.book_id)).length

  console.log(`   - 有效词书数: ${validBookIds.size}`)
  console.log(`   - 孤立单词记录: ${orphanedCount}`)
}

diagnoseWordsTable().catch(console.error)
