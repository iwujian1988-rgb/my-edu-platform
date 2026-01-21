/**
 * 检查还有多少单词需要补全
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRemaining() {
  console.log('🔍 检查需要补全的单词\n')

  const { data, error } = await supabase
    .from('words')
    .select('id, word, definition_en, example_sentence_en')
    .limit(1000)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  const lowQuality = data.filter(w => {
    const isTemplate =
      w.example_sentence_en?.startsWith('This is a ') ||
      w.example_sentence_en?.startsWith('A ') ||
      w.definition_en?.endsWith(' related concept or action.') ||
      !w.example_sentence_en ||
      !w.definition_en
    return isTemplate
  })

  console.log('📊 当前进度：')
  console.log(`  总单词数: ${data.length}`)
  console.log(`  高质量: ${data.length - lowQuality.length} (${Math.round((data.length - lowQuality.length) / data.length * 100)}%)`)
  console.log(`  低质量: ${lowQuality.length} (${Math.round(lowQuality.length / data.length * 100)}%)`)

  console.log('\n🔍 需要补全的单词（前30个）：')
  lowQuality.slice(0, 30).forEach(w => {
    console.log(`  - ${w.word}`)
  })

  return lowQuality
}

checkRemaining()
