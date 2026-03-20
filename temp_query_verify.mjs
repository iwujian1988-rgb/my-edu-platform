import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 1. 总数
  const { count: total } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
  
  // 2. example_sentence 为 NULL 的
  const { count: nullCount } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .is('example_sentence', null)
  
  // 3. example_sentence 为空字符串的
  const { count: emptyCount } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .eq('example_sentence', '')
  
  // 4. 有有效例句的 (不为 null 且不为空)
  const { count: hasValid } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .not('example_sentence', 'is', null)
    .neq('example_sentence', '')
  
  // 5. 获取词书名称映射
  const { data: books } = await supabase
    .from('word_books')
    .select('id, title')
  const bookMap = new Map()
  books?.forEach(b => bookMap.set(b.id, b.title))
  
  // 6. 按词书统计总数和需补充数
  const { data: allNeedExample } = await supabase
    .from('words')
    .select('book_id')
    .or('example_sentence.is.null,example_sentence.eq.""')
  
  const { data: allTotal } = await supabase
    .from('words')
    .select('book_id')
    .limit(150000)
  
  const needByBook = new Map()
  allNeedExample?.forEach(w => {
    const title = bookMap.get(w.book_id) || '未知词书'
    needByBook.set(title, (needByBook.get(title) || 0) + 1)
  })
  
  const totalByBook = new Map()
  allTotal?.forEach(w => {
    const title = bookMap.get(w.book_id) || '未知词书'
    totalByBook.set(title, (totalByBook.get(title) || 0) + 1)
  })
  
  console.log('============ 例句补充统计 (精确) ============')
  console.log(`总单词数: ${total}`)
  console.log(`example_sentence 为 NULL: ${nullCount}`)
  console.log(`example_sentence 为空字符串: ${emptyCount}`)
  console.log(`有有效例句: ${hasValid}`)
  console.log(`需要补充: ${(nullCount || 0) + (emptyCount || 0)}`)
  console.log(`完成率: ${((hasValid / total) * 100).toFixed(2)}%`)
  
  console.log('\n============ 按词书统计 (前20个) ============')
  const sorted = Array.from(totalByBook.entries())
    .map(([title, total]) => ({
      title,
      total,
      need: needByBook.get(title) || 0,
      done: total - (needByBook.get(title) || 0)
    }))
    .sort((a, b) => b.need - a.need)
    .slice(0, 20)
  
  sorted.forEach(s => {
    const rate = ((s.done / s.total) * 100).toFixed(1)
    console.log(`  ${s.title.substring(0, 25).padEnd(25)} | 总: ${String(s.total).padStart(5)} | 需补充: ${String(s.need).padStart(5)} | 完成: ${rate}%`)
  })
}

main().catch(console.error)
