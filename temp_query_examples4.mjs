import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('正在查询数据库...\n')
  
  // 1. 获取样本数据，看看 examples 字段的实际格式
  const { data: sampleAll, error: e1 } = await supabase
    .from('words')
    .select('id, word, examples, pos')
    .limit(20)
  
  console.log('=== 样本数据 (前20个) ===')
  sampleAll?.forEach(w => {
    const exPreview = w.examples ? 
      (typeof w.examples === 'string' ? w.examples.substring(0, 60) : JSON.stringify(w.examples).substring(0, 60)) 
      : 'NULL'
    console.log(`  ${w.word}: examples = ${exPreview}...`)
  })
  
  // 2. 统计有例句的
  const { data: withEx, count: withCount, error: e2 } = await supabase
    .from('words')
    .select('id', { count: 'exact' })
    .not('examples', 'is', null)
    .limit(1)
  
  console.log('\n=== 有例句的单词数 ===')
  console.log(`count: ${withCount}, error: ${e2?.message}`)
  
  // 3. 统计没有例句的
  const { data: withoutEx, count: withoutCount, error: e3 } = await supabase
    .from('words')
    .select('id', { count: 'exact' })
    .is('examples', null)
    .limit(1)
  
  console.log('\n=== 没有例句的单词数 ===')
  console.log(`count: ${withoutCount}, error: ${e3?.message}`)
  
  // 4. 总数
  const { count: total, error: e4 } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
  
  console.log('\n=== 总单词数 ===')
  console.log(`total: ${total}, error: ${e4?.message}`)
  
  // 5. 查看有例句的单词样本
  const { data: hasExamples, error: e5 } = await supabase
    .from('words')
    .select('word, examples')
    .not('examples', 'is', null)
    .limit(10)
  
  console.log('\n=== 有例句的单词样本 ===')
  hasExamples?.forEach(w => {
    console.log(`  ${w.word}: ${JSON.stringify(w.examples).substring(0, 100)}...`)
  })
  
  // 6. 查看没有例句的单词样本
  const { data: noExamples, error: e6 } = await supabase
    .from('words')
    .select('word, pos, book_id')
    .is('examples', null)
    .limit(30)
  
  console.log('\n=== 没有例句的单词样本 (需要补充) ===')
  noExamples?.forEach(w => {
    console.log(`  ${w.word} (pos: ${w.pos || '无'})`)
  })
  
  // 7. 计算统计
  if (total !== null && withCount !== null && withoutCount !== null) {
    console.log('\n============ 最终统计 ============')
    console.log(`总单词数: ${total}`)
    console.log(`已有例句: ${withCount}`)
    console.log(`需要补充: ${withoutCount}`)
    console.log(`完成率: ${((withCount/total)*100).toFixed(2)}%`)
  }
}

main().catch(console.error)
