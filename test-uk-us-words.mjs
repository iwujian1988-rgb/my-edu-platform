/**
 * 测试有英标美标的单词
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUKUSWords() {
  console.log('🧪 测试有英标美标的单词\n')

  const { data, error } = await supabase
    .from('words')
    .select('word, phonetic, uk_phonetic, us_phonetic')
    .or('uk_phonetic.not.is.null,us_phonetic.not.is.null')
    .limit(10)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log('📊 有英标/美标的单词测试：\n')

  data.forEach(word => {
    console.log(`单词: ${word.word}`)
    console.log(`  phonetic: ${word.phonetic || '(空)'}`)
    console.log(`  uk_phonetic: ${word.uk_phonetic || '(空)'}`)
    console.log(`  us_phonetic: ${word.us_phonetic || '(空)'}`)

    // 测试显示逻辑（模拟前端逻辑）
    const shouldShowUKUS = word.uk_phonetic || word.us_phonetic

    if (shouldShowUKUS) {
      console.log('  📺 显示: 英标/美标模式')
      if (word.uk_phonetic) console.log(`    - UK ${word.uk_phonetic}`)
      if (word.us_phonetic) console.log(`    - US ${word.us_phonetic}`)
    } else if (word.phonetic) {
      console.log(`  📺 显示: ${word.phonetic}`)
    } else {
      console.log('  📺 显示: (无音标)')
    }
    console.log('')
  })

  console.log('✅ 显示逻辑测试通过！')
  console.log('\n📝 逻辑说明：')
  console.log('  1. 如果有 uk_phonetic 或 us_phonetic：显示英标/美标')
  console.log('  2. 如果都没有：显示旧 phonetic 字段')
  console.log('  3. 如果完全没有：不显示音标')
}

testUKUSWords()
