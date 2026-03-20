import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('正在查询数据库...\n')
  
  // 1. 总单词数
  const { count: total } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
  
  // 2. 有中文例句的 (example_sentence 不为 null 且不为空字符串)
  const { count: withCnExample } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .not('example_sentence', 'is', null)
    .neq('example_sentence', '')
  
  // 3. 有英文例句的 (example_sentence_en 不为 null 且不为空字符串)
  const { count: withEnExample } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .not('example_sentence_en', 'is', null)
    .neq('example_sentence_en', '')
  
  // 4. 没有任何例句的
  const { count: noExample } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .or('example_sentence.is.null,example_sentence.eq.""')
  
  // 5. 获取没有例句的单词样本
  const { data: noExampleWords } = await supabase
    .from('words')
    .select('word, part_of_speech, book_id, example_sentence')
    .or('example_sentence.is.null,example_sentence.eq.""')
    .limit(50)
  
  // 6. 获取有例句的单词样本
  const { data: hasExampleWords } = await supabase
    .from('words')
    .select('word, example_sentence, example_sentence_en')
    .not('example_sentence', 'is', null)
    .neq('example_sentence', '')
    .limit(5)
  
  console.log('============ 例句补充统计 ============')
  console.log(`总单词数: ${total}`)
  console.log(`有中文例句: ${withCnExample}`)
  console.log(`有英文例句: ${withEnExample}`)
  console.log(`没有例句(需补充): ${noExample}`)
  console.log(`完成率: ${((withCnExample/total)*100).toFixed(2)}%`)
  
  console.log('\n============ 有例句的单词样本 ============')
  hasExampleWords?.forEach(w => {
    console.log(`  ${w.word}:`)
    console.log(`    中文: ${w.example_sentence?.substring(0, 50)}...`)
    console.log(`    英文: ${w.example_sentence_en?.substring(0, 50)}...`)
  })
  
  console.log('\n============ 需要补充的单词样本 (前50个) ============')
  noExampleWords?.forEach((w, i) => {
    console.log(`  ${i+1}. ${w.word} (词性: ${w.part_of_speech || '无'})`)
  })
  
  // 7. 按词书统计需要补充的数量
  const { data: allWords } = await supabase
    .from('words')
    .select('word, book_id, example_sentence')
    .or('example_sentence.is.null,example_sentence.eq.""')
    .limit(10000)
  
  // 获取词书名称
  const { data: books } = await supabase
    .from('word_books')
    .select('id, title')
  
  const bookMap = new Map()
  books?.forEach(b => bookMap.set(b.id, b.title))
  
  const statsByBook = new Map()
  allWords?.forEach(w => {
    const bookTitle = bookMap.get(w.book_id) || w.book_id
    if (!statsByBook.has(bookTitle)) {
      statsByBook.set(bookTitle, 0)
    }
    statsByBook.set(bookTitle, statsByBook.get(bookTitle) + 1)
  })
  
  console.log('\n============ 按词书统计需补充数量 (前15个) ============')
  const sorted = Array.from(statsByBook.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
  sorted.forEach(([book, count]) => {
    console.log(`  ${book.substring(0, 30)}: ${count} 个单词`)
  })
}

main().catch(console.error)
