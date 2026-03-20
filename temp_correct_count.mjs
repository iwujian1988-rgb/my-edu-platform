import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 用 or 条件分批获取
  let all = []
  let offset = 0
  
  while (true) {
    const { data } = await supabase
      .from('words')
      .select('id, word, book_id, example_sentence_en, part_of_speech')
      .or('example_sentence_en.ilike.%This is a%,example_sentence_en.ilike.%I like%')
      .range(offset, offset + 999)
    
    if (!data || data.length === 0) break
    
    // 过滤出真正的模板句
    const templatePattern = /This is a \w+\. \| I like/
    const templates = data.filter(w => templatePattern.test(w.example_sentence_en || ''))
    all = all.concat(templates)
    
    offset += 1000
    process.stdout.write(`\r已处理 ${offset} 条，找到模板 ${all.length} 条...`)
  }
  
  console.log(`\n\n============ 最终统计 ============`)
  console.log(`模板例句总数: ${all.length} 条`)
  
  // 保存到文件
  fs.writeFileSync('./temp/bad_examples_full.json', JSON.stringify(all, null, 2))
  console.log(`已保存到 temp/bad_examples_full.json`)
  
  // 显示几个样本
  console.log('\n样本:')
  all.slice(0, 5).forEach(w => {
    console.log(`  ${w.word}: ${w.example_sentence_en?.substring(0, 60)}...`)
  })
}

main().catch(console.error)
