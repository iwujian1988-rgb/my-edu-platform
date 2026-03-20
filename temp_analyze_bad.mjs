import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 获取词书映射
  const { data: books } = await supabase
    .from('books')
    .select('id, title')
  const bookMap = new Map(books?.map(b => [b.id, b.title]) || [])
  
  // 获取低质量例句的单词（包含 "This is a" 或 "I like"）
  const { data: badWords } = await supabase
    .from('words')
    .select('word, book_id, example_sentence_en')
    .or('example_sentence_en.ilike.%This is a%,example_sentence_en.ilike.%I like%')
    .limit(2000)
  
  // 按词书统计
  const statsByBook = new Map()
  badWords?.forEach(w => {
    const title = bookMap.get(w.book_id) || '未知'
    if (!statsByBook.has(title)) {
      statsByBook.set(title, [])
    }
    statsByBook.get(title).push(w)
  })
  
  console.log('============ 低质量例句按词书分布 ============\n')
  const sorted = Array.from(statsByBook.entries()).sort((a, b) => b[1].length - a[1].length)
  
  sorted.forEach(([title, words]) => {
    console.log(`${title}: ${words.length} 条`)
    // 显示前3个样本
    words.slice(0, 3).forEach(w => {
      console.log(`  - ${w.word}: ${w.example_sentence_en?.substring(0, 70)}...`)
    })
    console.log()
  })
  
  console.log(`============ 总计: ${badWords?.length || 0} 条低质量例句 ============`)
}

main().catch(console.error)
