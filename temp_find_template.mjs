import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 搜索模板例句模式
  const patterns = [
    'This is a',
    'I like',
    'is important',
    'is very important',
    'is useful',
    'is very useful'
  ]
  
  console.log('============ 搜索模板例句 ============\n')
  
  for (const pattern of patterns) {
    const { data, count } = await supabase
      .from('words')
      .select('word, example_sentence_en', { count: 'exact' })
      .ilike('example_sentence_en', `%${pattern}%`)
      .limit(10)
    
    console.log(`模式 "${pattern}": 找到 ${count} 条`)
    data?.slice(0, 5).forEach(w => {
      console.log(`  - ${w.word}: ${w.example_sentence_en?.substring(0, 80)}...`)
    })
    console.log()
  }
  
  // 统计总数
  console.log('============ 统计低质量例句 ============')
  
  let totalTemplate = 0
  for (const pattern of ['This is a %', 'I like %', '% is important', '% is very useful']) {
    const { count } = await supabase
      .from('words')
      .select('id', { count: 'exact', head: true })
      .ilike('example_sentence_en', pattern)
    console.log(`  "${pattern}": ${count} 条`)
    totalTemplate += count
  }
  
  console.log(`\n估计低质量例句总数: ${totalTemplate}`)
}

main().catch(console.error)
