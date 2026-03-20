import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('正在查询数据库...\n')
  
  // 1. 获取所有词书
  const { data: books, error: e1 } = await supabase
    .from('books')
    .select('id, title')
    .order('title')
  
  if (e1) {
    console.log('获取词书失败:', e1)
    return
  }
  
  console.log(`找到 ${books?.length || 0} 本词书\n`)
  
  const results = []
  
  for (const book of books || []) {
    // 总数
    const { count: total } = await supabase
      .from('words')
      .select('id', { count: 'exact', head: true })
      .eq('book_id', book.id)
    
    // 需补充数 (example_sentence 为 null)
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
  
  console.log('============ 按词书统计 ============')
  console.log('词书名称'.padEnd(35) + '| 总数    | 需补充  | 已完成  | 完成率')
  console.log('-'.repeat(75))
  
  let sumTotal = 0, sumNeed = 0, sumDone = 0
  results.forEach(r => {
    const title = r.title.length > 33 ? r.title.substring(0, 33) + '..' : r.title
    console.log(
      title.padEnd(35) + 
      '| ' + String(r.total).padStart(5) + '  | ' + 
      String(r.need).padStart(5) + '  | ' +
      String(r.done).padStart(5) + '  | ' +
      r.rate + '%'
    )
    sumTotal += r.total
    sumNeed += r.need
    sumDone += r.done
  })
  
  console.log('-'.repeat(75))
  console.log(
    '总计'.padEnd(35) + 
    '| ' + String(sumTotal).padStart(5) + '  | ' + 
    String(sumNeed).padStart(5) + '  | ' +
    String(sumDone).padStart(5) + '  | ' +
    ((sumDone/sumTotal)*100).toFixed(1) + '%'
  )
  
  // 输出需要补充的单词样本
  console.log('\n============ 需要补充的单词样本 ============')
  const { data: needWords } = await supabase
    .from('words')
    .select('word, part_of_speech, example_sentence')
    .is('example_sentence', null)
    .limit(100)
  
  console.log(`前100个需要补充的单词:`)
  needWords?.forEach((w, i) => {
    console.log(`  ${(i+1).toString().padStart(3)}. ${w.word.padEnd(20)} (词性: ${(w.part_of_speech || '无').padEnd(6)})`)
  })
}

main().catch(console.error)
