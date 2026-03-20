import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 检查剩余模板例句数量
  let all = []
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('words')
      .select('word, example_sentence_en')
      .or('example_sentence_en.ilike.%This is a%,example_sentence_en.ilike.%I like%')
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    const templatePattern = /This is a \w+\. \| I like/
    const templates = data.filter(w => templatePattern.test(w.example_sentence_en || ''))
    all = all.concat(templates)
    offset += 1000
  }
  
  console.log(`剩余模板例句: ${all.length} 条`)
}

main().catch(console.error)
