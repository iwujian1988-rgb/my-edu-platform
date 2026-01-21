/**
 * 查看words表的字段结构
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('🔍 查看words表的字段结构\n')

  // 使用PostgreSQL的information_schema查看表结构
  const { data, error } = await supabase
    .rpc('get_table_columns', { table_name: 'words' })
    .select('*')

  // 如果rpc失败，直接查询几个样本看字段
  const { data: sampleWords } = await supabase
    .from('words')
    .select()
    .limit(1)

  if (sampleWords && sampleWords.length > 0) {
    const columns = Object.keys(sampleWords[0])
    console.log('📋 words表字段列表：\n')
    columns.forEach((col, i) => {
      console.log(`${i + 1}. ${col}`)
    })

    console.log('\n📝 示例数据：\n')
    const sample = sampleWords[0]
    columns.forEach(col => {
      const value = sample[col]
      if (value !== null && value !== undefined) {
        const displayValue = typeof value === 'string' && value.length > 50
          ? value.substring(0, 50) + '...'
          : value
        console.log(`${col}: ${displayValue}`)
      }
    })
  }

  // 检查当前KET词库的字段覆盖情况
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

  const { data: ketWords } = await supabase
    .from('words')
    .select('word, definition, definition_en, example_sentence, example_sentence_en, collocation, collocation_en')
    .in('chapter_id', chapterIds)
    .limit(5)

  if (ketWords && ketWords.length > 0) {
    console.log('\n🔍 KET词库示例数据：\n')
    ketWords.forEach(w => {
      console.log(`${w.word}:`)
      console.log(`  中文释义: ${w.definition}`)
      console.log(`  英文释义: ${w.definition_en || '(无)'}`)
      console.log(`  例句(英): ${w.example_sentence_en || '(无)'}`)
      console.log(`  例句(中): ${w.example_sentence || '(无)'}`)
      console.log(`  搭配(英): ${w.collocation_en || '(无)'}`)
      console.log(`  搭配(中): ${w.collocation || '(无)'}`)
      console.log()
    })
  }

  // 统计字段覆盖率
  const { data: allWords } = await supabase
    .from('words')
    .select('definition_en, example_sentence, example_sentence_en, collocation, collocation_en')
    .in('chapter_id', chapterIds)

  if (allWords) {
    const totalCount = allWords.length
    const withDefinitionEn = allWords.filter(w => w.definition_en).length
    const withExampleEn = allWords.filter(w => w.example_sentence_en).length
    const withExampleCn = allWords.filter(w => w.example_sentence).length
    const withCollocationEn = allWords.filter(w => w.collocation_en).length
    const withCollocationCn = allWords.filter(w => w.collocation).length

    console.log('📊 当前字段覆盖率：')
    console.log(`  英文释义 definition_en: ${withDefinitionEn}/${totalCount} (${Math.round(withDefinitionEn/totalCount*100)}%)`)
    console.log(`  例句(英) example_sentence_en: ${withExampleEn}/${totalCount} (${Math.round(withExampleEn/totalCount*100)}%)`)
    console.log(`  例句(中) example_sentence: ${withExampleCn}/${totalCount} (${Math.round(withExampleCn/totalCount*100)}%)`)
    console.log(`  搭配(英) collocation_en: ${withCollocationEn}/${totalCount} (${Math.round(withCollocationEn/totalCount*100)}%)`)
    console.log(`  搭配(中) collocation: ${withCollocationCn}/${totalCount} (${Math.round(withCollocationCn/totalCount*100)}%)`)
  }
}

main()
