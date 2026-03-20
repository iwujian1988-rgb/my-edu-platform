import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 检查 word_books 表
  const { data: books, error: e1 } = await supabase
    .from('word_books')
    .select('id, title')
    .limit(5)
  
  console.log('word_books 样本:', books, 'error:', e1)
  
  // 检查 words 表的 book_id
  const { data: words, error: e2 } = await supabase
    .from('words')
    .select('id, word, book_id')
    .limit(5)
  
  console.log('words 样本:', words, 'error:', e2)
  
  // 检查是否有匹配
  if (books && words) {
    const bookIds = books.map(b => b.id)
    const wordBookIds = words.map(w => w.book_id)
    console.log('book_ids from word_books:', bookIds)
    console.log('book_ids from words:', wordBookIds)
    console.log('有匹配:', wordBookIds.some(id => bookIds.includes(id)))
  }
}

main().catch(console.error)
