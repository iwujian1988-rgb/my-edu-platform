/**
 * 将所有520个单词的AI数据更新到数据库
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 读取生成的AI数据
const wordData = JSON.parse(fs.readFileSync('ket-words-complete-ai-data.json', 'utf-8'))

async function main() {
  console.log('🚀 开始更新所有520个单词的AI数据到数据库\n')
  console.log(`📊 总共 ${wordData.length} 个单词需要更新\n`)

  let successCount = 0
  let errorCount = 0
  const errors = []

  // 批量处理，每批50个
  const batchSize = 50
  const totalBatches = Math.ceil(wordData.length / batchSize)

  for (let batch = 0; batch < totalBatches; batch++) {
    const start = batch * batchSize
    const end = Math.min(start + batchSize, wordData.length)
    const batchWords = wordData.slice(start, end)

    console.log(`\n📦 处理批次 ${batch + 1}/${totalBatches} (单词 ${start + 1}-${end})`)

    for (let i = 0; i < batchWords.length; i++) {
      const item = batchWords[i]
      const globalIndex = start + i

      try {
        const { error } = await supabase
          .from('words')
          .update({
            definition_en: item.definition_en,
            collocation: item.collocation,
            collocation_en: item.collocation_en,
            example_sentence: item.example_sentence,
            example_sentence_en: item.example_sentence_en
          })
          .eq('id', item.id)

        if (error) {
          errorCount++
          errors.push({ word: item.word, error: error.message })
        } else {
          successCount++
        }

        // 显示进度
        if ((i + 1) % 10 === 0 || i === batchWords.length - 1) {
          process.stdout.write(`\r  进度: ${Math.round((i + 1) / batchWords.length * 100)}% (${i + 1}/${batchWords.length}) - 成功: ${successCount}, 错误: ${errorCount}`)
        }
      } catch (e) {
        errorCount++
        errors.push({ word: item.word, error: e.message })
      }
    }
  }

  console.log('\n\n✅ 更新完成！\n')
  console.log('📊 最终统计：')
  console.log(`  总单词数: ${wordData.length}`)
  console.log(`  成功更新: ${successCount} 个 (${Math.round(successCount/wordData.length*100)}%)`)
  console.log(`  更新失败: ${errorCount} 个 (${Math.round(errorCount/wordData.length*100)}%)`)

  if (errors.length > 0) {
    console.log('\n❌ 错误详情：')
    errors.slice(0, 10).forEach(e => {
      console.log(`  ${e.word}: ${e.error}`)
    })
    if (errors.length > 10) {
      console.log(`  ... 还有 ${errors.length - 10} 个错误`)
    }
  }

  // 验证最终覆盖率
  const { data: ketBook } = await supabase
    .from('books')
    .select('id')
    .ilike('title', '%KET%')
    .single()

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id')
    .eq('book_id', ketBook.id)

  const chapterIds = chapters.map(c => c.id)

  const { data: allWordsDb } = await supabase
    .from('words')
    .select('definition_en, example_sentence_en, collocation_en')
    .in('chapter_id', chapterIds)

  const totalCount = allWordsDb.length
  const withDefinitionEn = allWordsDb.filter(w => w.definition_en).length
  const withExampleEn = allWordsDb.filter(w => w.example_sentence_en).length
  const withCollocationEn = allWordsDb.filter(w => w.collocation_en).length

  console.log('\n📊 最终覆盖率：')
  console.log(`  英文释义: ${withDefinitionEn}/${totalCount} (${Math.round(withDefinitionEn/totalCount*100)}%)`)
  console.log(`  例句(英): ${withExampleEn}/${totalCount} (${Math.round(withExampleEn/totalCount*100)}%)`)
  console.log(`  搭配(英): ${withCollocationEn}/${totalCount} (${Math.round(withCollocationEn/totalCount*100)}%)`)

  // 显示一些验证示例
  console.log('\n🔍 验证示例：\n')
  const samples = ['accident', 'Monday', 'red', 'family', 'happy']

  for (const word of samples) {
    const { data: w } = await supabase
      .from('words')
      .select('word, definition, definition_en, collocation_en, example_sentence_en, example_sentence')
      .eq('word', word)
      .in('chapter_id', chapterIds)
      .single()

    if (w) {
      console.log(`${w.word}:`)
      console.log(`  中文: ${w.definition}`)
      console.log(`  英文: ${w.definition_en}`)
      console.log(`  搭配: ${w.collocation_en}`)
      console.log(`  例句: ${w.example_sentence_en}`)
      console.log(`  翻译: ${w.example_sentence}`)
      console.log()
    }
  }
}

main()
