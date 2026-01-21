import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function findLowQualityWords() {
  const { data, error } = await supabase
    .from('words')
    .select('id, word, definition_en, collocation_en, example_sentence_en')

  if (error) {
    console.error('Error:', error)
    return
  }

  // 找出低质量的数据
  const lowQuality = data.filter(w => {
    // 检查是否是模板句
    const isTemplate =
      w.example_sentence_en?.startsWith('This is a ') ||
      w.example_sentence_en?.startsWith('A ') ||
      w.example_sentence_en?.startsWith('The ') ||
      w.collocation_en?.includes('very ') ||
      w.collocation_en?.includes('quite ') ||
      w.collocation_en?.includes(' and more') ||
      (w.definition_en?.startsWith('A ') && w.definition_en?.endsWith('.')) ||
      w.definition_en?.endsWith(' related concept or action.')

    return isTemplate
  })

  console.log(`🔍 发现 ${lowQuality.length} 个低质量单词需要改进\n`)

  // 按字母分组
  const byFirstLetter = {}
  lowQuality.forEach(w => {
    const first = w.word[0].toUpperCase()
    if (!byFirstLetter[first]) byFirstLetter[first] = []
    byFirstLetter[first].push(w)
  })

  Object.keys(byFirstLetter).sort().slice(0, 8).forEach(letter => {
    console.log(`${letter}组 (${byFirstLetter[letter].length}个):`)
    byFirstLetter[letter].slice(0, 5).forEach(w => {
      console.log(`  - ${w.word}: ${w.example_sentence_en?.substring(0, 40)}...`)
    })
    if (byFirstLetter[letter].length > 5) {
      console.log(`  ... 还有 ${byFirstLetter[letter].length - 5} 个`)
    }
    console.log()
  })

  // 保存列表到文件
  fs.writeFileSync('low-quality-words.json', JSON.stringify(lowQuality, null, 2))
  console.log(`✅ 已保存完整列表到 low-quality-words.json`)

  // 显示一些示例
  console.log('\n📝 低质量示例:\n')
  lowQuality.slice(0, 5).forEach(w => {
    console.log(`${w.word}:`)
    console.log(`  定义: ${w.definition_en}`)
    console.log(`  搭配: ${w.collocation_en}`)
    console.log(`  例句: ${w.example_sentence_en}`)
    console.log()
  })

  // 统计各类型
  const thisIs = lowQuality.filter(w => w.example_sentence_en?.startsWith('This is a ')).length
  const veryQuite = lowQuality.filter(w => w.collocation_en?.includes('very ') || w.collocation_en?.includes('quite ')).length
  const concept = lowQuality.filter(w => w.definition_en?.endsWith(' related concept or action.')).length

  console.log('📊 低质量类型统计:')
  console.log(`  "This is a" 模板: ${thisIs}个`)
  console.log(`  "very/quite" 搭配: ${veryQuite}个`)
  console.log(`  "related concept" 定义: ${concept}个`)
}

findLowQualityWords()
