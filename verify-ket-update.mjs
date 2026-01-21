/**
 * 验证KET词库ECDICT更新结果
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('🔍 验证KET词库ECDICT更新结果\n')

  try {
    // 获取KET词库
    const { data: ketBook } = await supabase
      .from('books')
      .select('id')
      .ilike('title', '%KET%')
      .single()

    if (!ketBook) {
      console.log('❌ 未找到KET词库')
      process.exit(1)
    }

    // 获取章节
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id')
      .eq('book_id', ketBook.id)

    const chapterIds = chapters.map(c => c.id)

    // 统计音标覆盖率
    const { data: allWords } = await supabase
      .from('words')
      .select('phonetic, definition, definition_en')
      .in('chapter_id', chapterIds)

    let withPhonetic = 0
    let withDefinitionEn = 0
    let withDefinition = 0

    allWords.forEach(w => {
      if (w.phonetic) withPhonetic++
      if (w.definition_en) withDefinitionEn++
      if (w.definition) withDefinition++
    })

    console.log('📊 字段覆盖率统计：')
    console.log(`  总单词数: ${allWords.length}`)
    console.log(`  音标: ${withPhonetic}/${allWords.length} (${Math.round(withPhonetic/allWords.length*100)}%)`)
    console.log(`  英文释义: ${withDefinitionEn}/${allWords.length} (${Math.round(withDefinitionEn/allWords.length*100)}%)`)
    console.log(`  中文释义: ${withDefinition}/${allWords.length} (${Math.round(withDefinition/allWords.length*100)}%)`)

    // 随机抽取10个单词验证
    const { data: samples } = await supabase
      .from('words')
      .select('word, phonetic, definition, definition_en')
      .in('chapter_id', chapterIds)
      .limit(10)

    console.log('\n📝 随机抽取10个单词验证：\n')

    samples.forEach((w, i) => {
      console.log(`${i + 1}. ${w.word}`)
      console.log(`   音标: ${w.phonetic || '(无)'}`)
      console.log(`   中文: ${w.definition?.substring(0, 40) || '(无)'}${w.definition?.length > 40 ? '...' : ''}`)
      console.log(`   英文: ${w.definition_en?.substring(0, 40) || '(无)'}${w.definition_en?.length > 40 ? '...' : ''}`)
      console.log()
    })

    console.log('✅ 验证完成！')

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
    process.exit(1)
  }
}

main()
