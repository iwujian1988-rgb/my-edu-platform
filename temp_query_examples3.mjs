import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('正在查询数据库...\n')
  
  // 1. 总单词数
  const { count: totalWords } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
  
  // 2. 有例句的单词数 (examples 不为 null 且不为空数组)
  const { data: withExamplesData, count: withExamples } = await supabase
    .from('words')
    .select('id', { count: 'exact' })
    .not('examples', 'is', null)
  
  // 3. 获取没有例句的单词样本
  const { data: noExamplesWords } = await supabase
    .from('words')
    .select('id, word, book_id, pos, examples')
    .is('examples', null)
    .limit(30)
  
  // 4. 获取有例句的单词样本
  const { data: hasExamplesWords } = await supabase
    .from('words')
    .select('id, word, examples')
    .not('examples', 'is', null)
    .limit(5)
  
  // 5. 按词书统计
  const { data: allWords } = await supabase
    .from('words')
    .select('word, book_id, examples')
    .limit(5000)
  
  const bookMap = new Map()
  allWords?.forEach(w => {
    const bookId = w.book_id || 'unknown'
    if (!bookMap.has(bookId)) {
      bookMap.set(bookId, { total: 0, hasExamples: 0, noExamples: 0 })
    }
    const stats = bookMap.get(bookId)
    stats.total++
    if (w.examples && w.examples !== null) {
      stats.hasExamples++
    } else {
      stats.noExamples++
    }
  })
  
  console.log('=== 例句补充统计 ===')
  console.log(`总单词数: ${totalWords}`)
  console.log(`已有例句: ${withExamples}`)
  console.log(`需要补充: ${totalWords - withExamples}`)
  console.log(`完成率: ${((withExamples/totalWords)*100).toFixed(2)}%`)
  
  console.log('\n=== 有例句的单词样本 ===')
  hasExamplesWords?.forEach(w => {
    console.log(`  - ${w.word}: ${w.examples?.substring(0, 50)}...`)
  })
  
  console.log('\n=== 需要补充的单词样本 (前30个) ===')
  noExamplesWords?.forEach(w => {
    console.log(`  - ${w.word} (词性: ${w.pos || '未知'})`)
  })
  
  console.log('\n=== 按词书统计 (前10个) ===')
  const sortedBooks = Array.from(bookMap.entries())
    .sort((a, b) => b[1].noExamples - a[1].noExamples)
    .slice(0, 10)
  sortedBooks.forEach(([bookId, stats]) => {
    console.log(`  ${bookId.substring(0, 8)}...: 总计 ${stats.total}, 有例句 ${stats.hasExamples}, 需补充 ${stats.noExamples}`)
  })
}

main().catch(console.error)
