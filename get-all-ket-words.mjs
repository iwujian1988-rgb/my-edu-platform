/**
 * 获取KET词库所有单词列表
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('📚 获取KET词库所有单词\n')

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

  const { data: allWords } = await supabase
    .from('words')
    .select('id, word, definition, part_of_speech')
    .in('chapter_id', chapterIds)
    .order('word')

  console.log(`✅ 共找到 ${allWords.length} 个单词\n`)

  // 按词性分类
  const byPartOfSpeech = {}
  allWords.forEach(w => {
    const pos = w.part_of_speech || 'unknown'
    if (!byPartOfSpeech[pos]) {
      byPartOfSpeech[pos] = []
    }
    byPartOfSpeech[pos].push({
      id: w.id,
      word: w.word,
      definition: w.definition
    })
  })

  console.log('📊 按词性统计：\n')
  Object.keys(byPartOfSpeech).sort().forEach(pos => {
    console.log(`  ${pos}: ${byPartOfSpeech[pos].length} 个`)
  })

  // 保存到文件
  const outputData = {
    total: allWords.length,
    words: allWords.map(w => ({
      id: w.id,
      word: w.word,
      definition: w.definition,
      part_of_speech: w.part_of_speech
    }))
  }

  fs.writeFileSync('ket-words-list.json', JSON.stringify(outputData, null, 2))
  console.log(`\n✅ 已保存到 ket-words-list.json`)

  // 显示前50个单词
  console.log('\n📝 前50个单词：\n')
  allWords.slice(0, 50).forEach((w, i) => {
    console.log(`${i + 1}. ${w.word} - ${w.definition.substring(0, 30)}...`)
  })
}

main()
