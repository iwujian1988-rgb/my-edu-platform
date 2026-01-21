import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProgress() {
  const { data, error } = await supabase
    .from('words')
    .select('id, word, definition_en, example_sentence_en')

  if (error) {
    console.error('Error:', error)
    return
  }

  const total = data.length

  // 找出低质量的数据
  const lowQuality = data.filter(w => {
    const isTemplate =
      w.example_sentence_en?.startsWith('This is a ') ||
      w.example_sentence_en?.startsWith('A ') ||
      w.definition_en?.endsWith(' related concept or action.')

    return isTemplate
  })

  const highQuality = total - lowQuality.length
  const percentage = Math.round(highQuality / total * 100)

  console.log('📊 当前数据质量统计:\n')
  console.log(`总单词数: ${total}`)
  console.log(`高质量数据: ${highQuality} 个 (${percentage}%)`)
  console.log(`低质量数据: ${lowQuality.length} 个 (${Math.round(lowQuality.length/total*100)}%)`)

  // 随机抽查几个
  console.log('\n🔍 随机抽查5个词:\n')
  const samples = [data[0], data[200], data[400], data[600], data[800]]

  samples.forEach(w => {
    const status = (w.example_sentence_en?.startsWith('This is a ') || w.definition_en?.endsWith(' related concept or action.')) ? '❌ 低质量' : '✅ 高质量'
    console.log(`${w.word}: ${status}`)
    if (status === '✅ 高质量' && w.example_sentence_en) {
      console.log(`  ${w.example_sentence_en.substring(0, 50)}...`)
    }
  })
}

checkProgress()
