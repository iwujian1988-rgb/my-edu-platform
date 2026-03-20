import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 精确统计模板句
  const patterns = [
    { name: '完整模板 (This is a X | I like X | X is important)', pattern: 'This is a%I like%is important' },
    { name: '部分模板 (This is a | I like)', pattern: 'This is a%I like' },
    { name: '只有 (This is a)', pattern: 'This is a' },
    { name: '只有 (I like)', pattern: 'I like%' },
  ]
  
  console.log('============ 模板例句精确统计 ============\n')
  
  for (const p of patterns) {
    let all = []
    let offset = 0
    while (true) {
      const { data } = await supabase
        .from('words')
        .select('word, example_sentence_en')
        .ilike('example_sentence_en', p.pattern)
        .range(offset, offset + 999)
      if (!data || data.length === 0) break
      all = all.concat(data)
      offset += 1000
    }
    console.log(`${p.name}: ${all.length} 条`)
    
    if (p.name.includes('完整模板')) {
      console.log('  样本:')
      all.slice(0, 3).forEach(w => {
        console.log(`    ${w.word}: ${w.example_sentence_en?.substring(0, 70)}...`)
      })
    }
  }
  
  // 总体统计
  const { count: total } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
  
  const { count: hasEx } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .not('example_sentence_en', 'is', null)
  
  const { count: noEx } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .is('example_sentence_en', null)
  
  console.log('\n============ 总体统计 ============')
  console.log(`总单词数: ${total}`)
  console.log(`有例句: ${hasEx}`)
  console.log(`无例句: ${noEx}`)
}

main().catch(console.error)
