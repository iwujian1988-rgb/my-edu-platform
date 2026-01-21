/**
 * 检查uk_phonetic和us_phonetic字段的数据情况
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

    if (!ketBook) {
      console.log('❌ 未找到KET词库')
      process.exit(1)
    }

    const { data: chapters } = await supabase
      .from('chapters')
      .select('id')
      .eq('book_id', ketBook.id)

    const chapterIds = chapters.map(c => c.id)

    console.log('📊 检查KET词库音标字段情况\n')

    // 2. 统计各字段的数据情况
    const { data: allWords } = await supabase
      .from('words')
      .select('phonetic, uk_phonetic, us_phonetic')
      .in('chapter_id', chapterIds)

    const totalCount = allWords.length
    const withPhonetic = allWords.filter(w => w.phonetic).length
    const withUkPhonetic = allWords.filter(w => w.uk_phonetic).length
    const withUsPhonetic = allWords.filter(w => w.us_phonetic).length

    console.log('📈 音标覆盖率统计：')
    console.log(`  总单词数: ${totalCount}`)
    console.log(`  有phonetic: ${withPhonetic} (${Math.round(withPhonetic/totalCount*100)}%)`)
    console.log(`  有uk_phonetic: ${withUkPhonetic} (${Math.round(withUkPhonetic/totalCount*100)}%)`)
    console.log(`  有us_phonetic: ${withUsPhonetic} (${Math.round(withUsPhonetic/totalCount*100)}%)\n`)

    // 3. 显示有uk_phonetic或us_phonetic的单词
    const { data: wordsWithBoth } = await supabase
      .from('words')
      .select('word, phonetic, uk_phonetic, us_phonetic')
      .in('chapter_id', chapterIds)
      .or('uk_phonetic.not.is.null,us_phonetic.not.is.null')

    if (wordsWithBoth && wordsWithBoth.length > 0) {
      console.log(`✅ 有uk_phonetic或us_phonetic的单词 (${wordsWithBoth.length}个):`)
      wordsWithBoth.slice(0, 10).forEach(w => {
        console.log(`  ${w.word}:`)
        console.log(`    phonetic: ${w.phonetic || '(无)'}`)
        console.log(`    uk_phonetic: ${w.uk_phonetic || '(无)'}`)
        console.log(`    us_phonetic: ${w.us_phonetic || '(无)'}`)
      })
    } else {
      console.log('❌ 没有单词有uk_phonetic或us_phonetic数据\n')
      console.log('这说明：')
      console.log('  1. 脚本更新时没有写入这两个字段')
      console.log('  2. 或者Free Dictionary API没有返回区分英式/美式的音标\n')

      // 4. 测试API看是否返回多个音标
      console.log('🔍 测试Free Dictionary API返回的数据格式：\n')

      const testWords = ['barbecue', 'chips', 'form']
      for (const testWord of testWords) {
        try {
          const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${testWord}`)
          if (response.ok) {
            const data = await response.json()
            const entry = data[0]

            console.log(`📖 ${testWord}:`)
            console.log(`   主音标: ${entry.phonetic || '(无)'}`)

            if (entry.phonetics && entry.phonetics.length > 0) {
              console.log(`   所有音标 (${entry.phonetics.length}个):`)
              entry.phonetics.forEach((p, i) => {
                console.log(`     ${i + 1}. ${p.text || '(无text)'} ${p.audio ? '(有音频)' : ''}`)
              })
            }
            console.log()
          }
        } catch (e) {
          console.error(`   ❌ 查询失败: ${e.message}`)
        }
      }
    }

  } catch (error) {
    console.error('❌ 错误:', error.message)
    process.exit(1)
  }
}

main()
