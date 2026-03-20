import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 获取所有词书
  const { data: books } = await supabase
    .from('word_books')
    .select('id, title')
    .order('title')
  
  console.log('============ 按词书详细统计 ============\n')
  
  const results = []
  
  for (const book of books || []) {
    // 总数
    const { count: total } = await supabase
      .from('words')
      .select('id', { count: 'exact', head: true })
      .eq('book_id', book.id)
    
    // 需补充数
    const { count: need } = await supabase
      .from('words')
      .select('id', { count: 'exact', head: true })
      .eq('book_id', book.id)
      .is('example_sentence', null)
    
    if (total > 0) {
      const done = total - need
      const rate = ((done / total) * 100).toFixed(1)
      results.push({ title: book.title, total, need, done, rate })
    }
  }
  
  // 按需补充数量排序
  results.sort((a, b) => b.need - a.need)
  
  console.log('词书名称'.padEnd(30) + '| 总数    | 需补充  | 已完成  | 完成率')
  console.log('-'.repeat(70))
  
  let sumTotal = 0, sumNeed = 0, sumDone = 0
  results.forEach(r => {
    console.log(
      r.title.substring(0, 28).padEnd(30) + 
      '| ' + String(r.total).padStart(5) + '  | ' + 
      String(r.need).padStart(5) + '  | ' +
      String(r.done).padStart(5) + '  | ' +
      r.rate + '%'
    )
    sumTotal += r.total
    sumNeed += r.need
    sumDone += r.done
  })
  
  console.log('-'.repeat(70))
  console.log(
    '总计'.padEnd(30) + 
    '| ' + String(sumTotal).padStart(5) + '  | ' + 
    String(sumNeed).padStart(5) + '  | ' +
    String(sumDone).padStart(5) + '  | ' +
    ((sumDone/sumTotal)*100).toFixed(1) + '%'
  )
}

main().catch(console.error)
