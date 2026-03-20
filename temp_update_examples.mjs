import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 读取已生成的结果
  const data = JSON.parse(fs.readFileSync('./temp/generated_examples_v3.json', 'utf-8'))
  
  // 只处理成功的
  const successResults = data.results.filter(r => r.status === 'success' && r.new_sentences?.length > 0)
  
  console.log(`============ 写入高质量例句到数据库 ============`)
  console.log(`成功生成的高质量例句: ${successResults.length} 条`)
  
  let updated = 0
  let failed = 0
  
  for (const result of successResults) {
    // 合并例句
    const enSentences = result.new_sentences.map(s => s.en).join(' | ')
    const cnSentences = result.new_sentences.map(s => s.cn).join(' | ')
    
    // 更新数据库
    const { error } = await supabase
      .from('words')
      .update({
        example_sentence_en: enSentences,
        example_sentence: cnSentences,
        updated_at: new Date().toISOString()
      })
      .eq('word', result.word)
      .eq('book_id', result.book_id)
    
    if (error) {
      console.log(`  ❌ ${result.word}: ${error.message}`)
      failed++
    } else {
      updated++
      if (updated % 50 === 0) {
        console.log(`  ✅ 已更新 ${updated} 条...`)
      }
    }
  }
  
  console.log(`\n============ 更新完成 ============`)
  console.log(`成功更新: ${updated} 条`)
  console.log(`更新失败: ${failed} 条`)
}

main().catch(console.error)
