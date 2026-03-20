import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 分批获取所有模板例句
  let allBad = []
  let offset = 0
  const batchSize = 500
  
  while (true) {
    const { data } = await supabase
      .from('words')
      .select('id, word, book_id, example_sentence_en, part_of_speech')
      .ilike('example_sentence_en', '%This is a%I like%')
      .range(offset, offset + batchSize - 1)
    
    if (!data || data.length === 0) break
    allBad = allBad.concat(data)
    offset += batchSize
    console.log(`已获取 ${allBad.length} 条...`)
  }
  
  console.log(`\n总剩余模板例句: ${allBad.length} 条`)
  
  // 保存到文件
  fs.writeFileSync('./temp/remaining_bad_examples.json', JSON.stringify(allBad, null, 2))
  console.log(`已保存到 temp/remaining_bad_examples.json`)
  
  // 按词书统计
  const { data: books } = await supabase.from('books').select('id, title')
  const bookMap = new Map(books?.map(b => [b.id, b.title]) || [])
  
  const byBook = {}
  allBad.forEach(w => {
    const title = bookMap.get(w.book_id) || '未知'
    byBook[title] = (byBook[title] || 0) + 1
  })
  
  console.log('\n按词书分布:')
  Object.entries(byBook).sort((a, b) => b[1] - a[1]).forEach(([title, count]) => {
    console.log(`  ${title}: ${count}`)
  })
}

main().catch(console.error)
