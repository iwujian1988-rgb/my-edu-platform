import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 1. 检查是否还有模板例句
  let templateCount = 0
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('words')
      .select('word, example_sentence_en')
      .or('example_sentence_en.ilike.%This is a%,example_sentence_en.ilike.%I like%')
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    const templatePattern = /This is a \w+\. \| I like/
    templateCount += data.filter(w => templatePattern.test(w.example_sentence_en || '')).length
    offset += 1000
  }
  
  // 2. 总体统计
  const { count: total } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
  
  const { count: hasExample } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .not('example_sentence_en', 'is', null)
  
  // 3. 查看几个被更新的单词样本
  const { data: samples } = await supabase
    .from('words')
    .select('word, example_sentence_en, example_sentence')
    .in('word', ['Tibet', 'confusing', 'find', 'maybe', 'negatively'])
    .limit(5)
  
  console.log('============ 最终报告 ============\n')
  console.log(`模板例句剩余: ${templateCount} 条`)
  console.log(`总单词数: ${total}`)
  console.log(`有例句: ${hasExample}`)
  
  console.log('\n============ 已更新的单词样本 ============')
  samples?.forEach(w => {
    console.log(`\n${w.word}:`)
    console.log(`  英文: ${w.example_sentence_en?.substring(0, 100)}...`)
    console.log(`  中文: ${w.example_sentence?.substring(0, 50)}...`)
  })
}

main().catch(console.error)
