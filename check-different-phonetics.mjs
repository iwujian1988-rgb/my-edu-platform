/**
 * 查找英式和美式音标不同的单词
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

    console.log('🔍 查找英式和美式音标不同的单词\n')

    // 2. 获取所有有音标的单词
    const { data: allWords } = await supabase
      .from('words')
      .select('word, phonetic, uk_phonetic, us_phonetic')
      .in('chapter_id', chapterIds)
      .not('uk_phonetic', 'is', null)
      .not('us_phonetic', 'is', null)

    // 3. 过滤出不同的
    const differentPhonetics = allWords.filter(w => w.uk_phonetic !== w.us_phonetic)

    console.log(`📊 统计：`)
    console.log(`  有uk_phonetic和us_phonetic的单词: ${allWords.length} 个`)
    console.log(`  英式≠美式的单词: ${differentPhonetics.length} 个\n`)

    if (differentPhonetics.length > 0) {
      console.log('✅ 英式和美式音标不同的单词：\n')
      differentPhonetics.forEach(w => {
        console.log(`${w.word}:`)
        console.log(`  英式: ${w.uk_phonetic}`)
        console.log(`  美式: ${w.us_phonetic}`)
        console.log()
      })
    } else {
      console.log('❌ 没有找到英式和美式音标不同的单词\n')
      console.log('这说明Free Dictionary API对KET词库的单词')
      console.log('只提供了一个统一的音标（通常以英式为主）\n')

      console.log('💡 建议方案：')
      console.log('  1. 对于KET级别的学习，单一音标已经足够')
      console.log('  2. 如果需要区分英式/美式，可以考虑使用其他API')
      console.log('  3. 或者只保留phonetic字段，uk_phonetic和us_phonetic留空供未来扩展\n')

      // 显示一些示例
      console.log('📝 示例单词的音标：\n')
      const samples = ['afterwards', 'chips', 'barbecue', 'form', 'dance']

      for (const word of samples) {
        const { data: w } = await supabase
          .from('words')
          .select('word, phonetic')
          .eq('word', word)
          .in('chapter_id', chapterIds)
          .single()

        if (w) {
          console.log(`  ${w.word}: ${w.phonetic}`)
        }
      }
    }

  } catch (error) {
    console.error('❌ 错误:', error.message)
    process.exit(1)
  }
}

main()
