/**
 * 检查KET词库音标覆盖率
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data: ketBook } = await supabase.from('books').select('id').ilike('title', '%KET%').single()

  if (!ketBook) {
    console.log('❌ 未找到KET词库')
    return
  }

  const { data: chapters } = await supabase.from('chapters').select('id').eq('book_id', ketBook.id)

  if (!chapters || chapters.length === 0) {
    console.log('❌ 未找到章节')
    return
  }

  const chapterIds = chapters.map(c => c.id)

  // 检查前5个单词
  const { data: words } = await supabase
    .from('words')
    .select('word, phonetic, uk_phonetic, us_phonetic')
    .in('chapter_id', chapterIds)
    .limit(5)

  if (!words) {
    console.log('❌ 未找到单词')
    return
  }

  console.log('📊 音标字段检查（前5个单词）:\n')
  words.forEach(w => {
    console.log(`${w.word}:`)
    console.log(`  phonetic: ${w.phonetic || '(无)'}`)
    console.log(`  uk_phonetic: ${w.uk_phonetic || '(无)'}`)
    console.log(`  us_phonetic: ${w.us_phonetic || '(无)'}`)
  })

  // 统计音标覆盖率
  const { data: allWords } = await supabase
    .from('words')
    .select('phonetic')
    .in('chapter_id', chapterIds)

  const withPhonetic = allWords.filter(w => w.phonetic).length
  console.log(`\n音标覆盖率: ${withPhonetic}/${allWords.length} (${Math.round(withPhonetic/allWords.length*100)}%)`)
}

main()
