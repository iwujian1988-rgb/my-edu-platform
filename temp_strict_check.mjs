import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://snnrjnpcmdsdlyldvvps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'
)

// 最严格的模板匹配
const STRICT_TEMPLATE = /^This is a \w+\. \| I like \w+\. \| \w+ is important\.$/

async function main() {
  let count = 0
  let offset = 0
  let samples = []
  
  while (true) {
    const { data } = await supabase
      .from('words')
      .select('word, example_sentence_en')
      .not('example_sentence_en', 'is', null)
      .range(offset, offset + 999)
    
    if (!data || data.length === 0) break
    
    for (const w of data) {
      const ex = w.example_sentence_en || ''
      // 严格匹配完整模板
      if (STRICT_TEMPLATE.test(ex.trim())) {
        count++
        if (samples.length < 5) samples.push(w)
      }
    }
    offset += 1000
  }
  
  console.log('============ 严格检查 ============')
  console.log(`完整模板例句: ${count} 条`)
  
  if (samples.length > 0) {
    console.log('\n样本:')
    samples.forEach(w => console.log(`  ${w.word}: ${w.example_sentence_en}`))
  } else {
    console.log('\n✅ 没有找到完整模板例句!')
  }
}

main()
