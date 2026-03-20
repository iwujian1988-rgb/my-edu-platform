import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 直接查询几个已知的模板例句单词
  const testWords = ['psychiatry', 'qualifier', 'raiser', 'reorient', 'revaluation']
  
  for (const word of testWords) {
    const { data } = await supabase
      .from('words')
      .select('word, example_sentence_en')
      .eq('word', word)
      .limit(1)
    
    console.log(`${word}: ${data?.[0]?.example_sentence_en?.substring(0, 80)}...`)
  }
  
  // 用 or 条件查询
  const { data: orData, error } = await supabase
    .from('words')
    .select('word, example_sentence_en')
    .or('example_sentence_en.ilike.%This is a%,example_sentence_en.ilike.%I like%')
    .limit(10)
  
  console.log('\nor 查询结果:', orData?.length, '条')
  console.log('错误:', error)
  orData?.forEach(w => {
    console.log(`  ${w.word}: ${w.example_sentence_en?.substring(0, 60)}...`)
  })
}

main().catch(console.error)
