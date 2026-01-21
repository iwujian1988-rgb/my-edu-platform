/**
 * 查找没有音标的单词
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  try {
    // 1. 获取KET词库
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

    console.log('🔍 查找没有音标的单词\n')

    // 2. 获取没有phonetic的单词
    const { data: wordsWithoutPhonetic } = await supabase
      .from('words')
      .select('id, word, definition')
      .in('chapter_id', chapterIds)
      .is('phonetic', null)

    console.log(`📊 共有 ${wordsWithoutPhonetic.length} 个单词没有音标：\n`)

    wordsWithoutPhonetic.forEach((w, i) => {
      console.log(`${i + 1}. ${w.word}`)
      if (w.definition) {
        const shortDef = w.definition.length > 50 ? w.definition.substring(0, 50) + '...' : w.definition
        console.log(`   中文: ${shortDef}`)
      }
      console.log()
    })

    // 3. 输出为JSON格式，方便后续处理
    console.log('\n─────────────────────────────────────────\n')
    console.log('📋 JSON格式（用于AI生成音标）：\n')
    console.log(JSON.stringify(wordsWithoutPhonetic.map(w => ({
      id: w.id,
      word: w.word
    })), null, 2))

  } catch (error) {
    console.error('❌ 错误:', error.message)
    process.exit(1)
  }
}

main()
