import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 获取所有包含模板的例句
  const { data: badWords } = await supabase
    .from('words')
    .select('id, word, book_id, example_sentence_en, part_of_speech')
    .or('example_sentence_en.ilike.%This is a%,example_sentence_en.ilike.%I like%')
    .limit(5000)
  
  // 过滤出真正的模板句
  const templatePattern = /This is a \w+\. \| I like/
  const realTemplates = badWords?.filter(w => templatePattern.test(w.example_sentence_en || '')) || []
  
  console.log(`剩余模板例句: ${realTemplates.length} 条`)
  
  // 保存到文件供 Python 脚本使用
  fs.writeFileSync('./temp/remaining_bad_examples.json', JSON.stringify(realTemplates, null, 2))
  console.log(`已保存到 temp/remaining_bad_examples.json`)
  
  // 显示前10个
  console.log('\n前10个:')
  realTemplates.slice(0, 10).forEach(w => {
    console.log(`  ${w.word}: ${w.example_sentence_en?.substring(0, 50)}...`)
  })
}

main().catch(console.error)
