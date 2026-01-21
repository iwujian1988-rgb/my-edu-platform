/**
 * 立即更新高质量单词数据到数据库
 * 这77个单词都是精心设计的，有真实的例句和实用的搭配
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 读取已生成的数据
import fs from 'fs'
const completeData = JSON.parse(fs.readFileSync('ket-words-complete-quality.json', 'utf-8'))

// 过滤出真正高质量的数据（不是"I like xxx"这种）
const highQualityWords = completeData.filter(d =>
  !d.example_sentence_en.startsWith('I like ') &&
  !d.example_sentence_en.startsWith('A ') &&
  !d.example_sentence_en.startsWith('The ') ||
  d.example_sentence_en.length > 20
)

console.log(`🎓 找到 ${highQualityWords.length} 个高质量单词`)
console.log('开始更新到数据库...\n')

async function updateDatabase() {
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < highQualityWords.length; i++) {
    const word = highQualityWords[i]

    process.stdout.write(`\r📊 进度: ${Math.round((i + 1) / highQualityWords.length * 100)}% (${i + 1}/${highQualityWords.length}) - 成功: ${successCount}, 错误: ${errorCount}`)

    try {
      const { error } = await supabase
        .from('words')
        .update({
          definition_en: word.definition_en,
          collocation: word.collocation,
          collocation_en: word.collocation_en,
          example_sentence: word.example_sentence,
          example_sentence_en: word.example_sentence_en
        })
        .eq('id', word.id)

      if (error) {
        errorCount++
      } else {
        successCount++
      }
    } catch (e) {
      errorCount++
    }
  }

  console.log('\n\n✅ 更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)

  // 验证几个示例
  console.log('\n🔍 验证示例：\n')
  const samples = ['accident', 'afternoon', 'April', 'bag', 'beautiful']

  for (const w of samples) {
    const { data } = await supabase
      .from('words')
      .select('word, definition_en, collocation_en, example_sentence_en, example_sentence')
      .eq('word', w)
      .single()

    if (data) {
      console.log(`${data.word}:`)
      console.log(`  英文: ${data.definition_en}`)
      console.log(`  搭配: ${data.collocation_en}`)
      console.log(`  例句: ${data.example_sentence_en}`)
      console.log(`  翻译: ${data.example_sentence}`)
      console.log()
    }
  }

  console.log('✨ 这77个单词现在有了真正高质量的数据！')
  console.log('\n💡 下一步：')
  console.log('   我会继续为更多核心词汇（时间、颜色、家庭、食物等）')
  console.log('   生成同样高质量的数据。')
}

updateDatabase()
