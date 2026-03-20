import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 获取样本分析例句长度
  const { data: words } = await supabase
    .from('words')
    .select('word, example_sentence_en')
    .not('example_sentence_en', 'is', null)
    .limit(5000)
  
  // 按长度分组
  const byLength = { short: 0, medium: 0, long: 0, veryLong: 0 }
  const shortExamples = []
  
  words?.forEach(w => {
    const len = w.example_sentence_en?.split(/\s+/).length || 0
    if (len < 10) {
      byLength.short++
      if (shortExamples.length < 30) {
        shortExamples.push({ word: w.word, len, text: w.example_sentence_en?.substring(0, 80) })
      }
    } else if (len < 20) {
      byLength.medium++
    } else if (len < 40) {
      byLength.long++
    } else {
      byLength.veryLong++
    }
  })
  
  console.log('============ 例句长度分布 (样本5000条) ============')
  console.log(`短句(<10词): ${byLength.short} (${(byLength.short/50).toFixed(1)}%)`)
  console.log(`中等(10-20词): ${byLength.medium} (${(byLength.medium/50).toFixed(1)}%)`)
  console.log(`较长(20-40词): ${byLength.long} (${(byLength.long/50).toFixed(1)}%)`)
  console.log(`很长(>40词): ${byLength.veryLong} (${(byLength.veryLong/50).toFixed(1)}%)`)
  
  console.log('\n============ 短例句样本 (<10词) ============')
  shortExamples.forEach((w, i) => {
    console.log(`${i+1}. ${w.word} (${w.len}词): ${w.text}...`)
  })
  
  // 检查简单句模式
  const simplePatterns = [
    /^I (have|like|love|want|need|use) /i,
    /^She (has|likes|loves|wants|needs|uses) /i,
    /^He (has|likes|loves|wants|needs|uses) /i,
    /^There is (a|an) /i,
    /^There are /i,
    /^It is (a|an|very|quite) /i,
    /^This is (a|an) /i,
  ]
  
  let simpleCount = 0
  const simpleExamples = []
  
  words?.forEach(w => {
    const sentences = w.example_sentence_en?.split('|') || []
    for (const s of sentences) {
      const trimmed = s.trim()
      for (const pattern of simplePatterns) {
        if (pattern.test(trimmed)) {
          simpleCount++
          if (simpleExamples.length < 20) {
            simpleExamples.push({ word: w.word, text: trimmed.substring(0, 60) })
          }
          break
        }
      }
    }
  })
  
  console.log('\n============ 简单句模式 ============')
  console.log(`匹配简单句模式: ${simpleCount} 条`)
  simpleExamples.forEach((w, i) => {
    console.log(`${i+1}. ${w.word}: ${w.text}...`)
  })
}

main().catch(console.error)
