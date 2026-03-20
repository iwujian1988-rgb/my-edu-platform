import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 获取有例句的单词样本
  const { data: words } = await supabase
    .from('words')
    .select('word, example_sentence, example_sentence_en')
    .not('example_sentence', 'is', null)
    .limit(30)
  
  console.log('============ 现有例句样本 ============\n')
  words?.forEach((w, i) => {
    console.log(`${i+1}. ${w.word}`)
    console.log(`   中文: ${w.example_sentence?.substring(0, 80)}...`)
    console.log(`   英文: ${w.example_sentence_en?.substring(0, 80)}...`)
    console.log()
  })
}

main().catch(console.error)
