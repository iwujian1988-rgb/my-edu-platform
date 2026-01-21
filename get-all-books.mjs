import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getAllBooks() {
  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log('📚 全部词书列表\n')
  console.log('总数:', books.length, '本\n')

  // 按分类分组
  const byCategory = {}
  books.forEach(book => {
    const category = book.category || '未分类'
    if (!byCategory[category]) {
      byCategory[category] = []
    }
    byCategory[category].push(book)
  })

  // 显示分类统计
  console.log('📊 分类统计:')
  console.log('═'.repeat(80))
  Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length).forEach(([category, books]) => {
    console.log(`\n【${category}】 - ${books.length}本`)
  })

  // 显示详细列表
  console.log('\n\n📖 详细列表:')
  console.log('═'.repeat(80))

  Object.entries(byCategory).sort((a, b) => a[0].localeCompare(b[0])).forEach(([category, books]) => {
    console.log(`\n### 【${category}】(${books.length}本) ###`)
    books.forEach((book, index) => {
      const status = book.is_public ? '🟢公开' : '🔴私有'
      const official = book.is_official ? ' ⭐官方' : ''
      const wordCount = book.word_count || 0
      console.log(`  ${index + 1}. ${status}${official} [${book.id.slice(0, 8)}] ${book.name}`)
      console.log(`      ${book.description || '(无描述)'} - ${wordCount}词`)
    })
  })

  console.log('\n═'.repeat(80))
}

getAllBooks()
