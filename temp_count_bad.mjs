import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 获取所有包含模板的例句
  const { data: badWords } = await supabase
    .from('words')
    .select('id, word, example_sentence_en')
    .or('example_sentence_en.ilike.%This is a%,example_sentence_en.ilike.%I like%')
    .limit(5000)
  
  // 过滤出真正的模板句
  const templatePattern = /This is a \w+\. \| I like/
  const realTemplates = badWords?.filter(w => templatePattern.test(w.example_sentence_en || '')) || []
  
  console.log(`============ 低质量例句统计 ============`)
  console.log(`查询到的记录: ${badWords?.length || 0}`)
  console.log(`真正的模板句: ${realTemplates.length}`)
  
  if (realTemplates.length > 0) {
    console.log('\n前5个样本:')
    realTemplates.slice(0, 5).forEach(w => {
      console.log(`  ${w.word}: ${w.example_sentence_en?.substring(0, 60)}...`)
    })
  } else {
    console.log('\n没有找到模板句！可能已经修复完成？')
  }
}

main().catch(console.error)
