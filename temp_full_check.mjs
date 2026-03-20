import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function countByPattern(pattern, desc) {
  let all = []
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('words')
      .select('word, example_sentence_en')
      .ilike('example_sentence_en', pattern)
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    all = all.concat(data)
    offset += 1000
  }
  console.log(`${desc}: ${all.length} 条`)
  return all.length
}

async function main() {
  console.log('============ 低质量例句全面检查 ============\n')
  
  // 各种模板模式
  await countByPattern('%This is a%', '"This is a"')
  await countByPattern('%I like%', '"I like"')
  await countByPattern('%is important%', '"is important"')
  await countByPattern('%is very important%', '"is very important"')
  await countByPattern('%is useful%', '"is useful"')
  await countByPattern('%plays an important role%', '"plays an important role"')
  await countByPattern('%It is worth noting%', '"It is worth noting"')
  
  // 组合模式
  await countByPattern('%This is a%I like%', '"This is a" + "I like"')
  await countByPattern('%This is a%is important%', '"This is a" + "is important"')
  
  // 获取总单词数和有例句的单词数
  const { count: total } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
  
  const { count: hasExample } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .not('example_sentence_en', 'is', null)
  
  console.log(`\n============ 总体统计 ============`)
  console.log(`总单词数: ${total}`)
  console.log(`有英文例句: ${hasExample}`)
  console.log(`没有英文例句: ${total - hasExample}`)
}

main().catch(console.error)
