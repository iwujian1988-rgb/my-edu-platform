import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 再次检查低质量例句数量
  const { count: thisIsCount } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .ilike('example_sentence_en', '%This is a%')
  
  const { count: iLikeCount } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .ilike('example_sentence_en', '%I like%')
  
  // 获取几个样本看看是否还是模板
  const { data: samples } = await supabase
    .from('words')
    .select('word, example_sentence_en')
    .ilike('example_sentence_en', '%This is a%')
    .limit(5)
  
  console.log('============ 当前低质量例句统计 ============')
  console.log(`包含 "This is a": ${thisIsCount} 条`)
  console.log(`包含 "I like": ${iLikeCount} 条`)
  
  console.log('\n样本:')
  samples?.forEach(s => {
    console.log(`  ${s.word}: ${s.example_sentence_en?.substring(0, 80)}...`)
  })
}

main().catch(console.error)
