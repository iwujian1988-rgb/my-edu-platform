import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 直接搜索
  const { data, error } = await supabase
    .from('words')
    .select('word, example_sentence_en')
    .ilike('example_sentence_en', '%This is a%I like%')
    .limit(20)
  
  console.log('查询结果:', data?.length, '条')
  console.log('错误:', error)
  
  data?.forEach(w => {
    console.log(`  ${w.word}: ${w.example_sentence_en?.substring(0, 60)}...`)
  })
}

main().catch(console.error)
