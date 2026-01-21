/**
 * 测试音标显示逻辑
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPhoneticDisplay() {
  console.log('🧪 测试音标显示逻辑\n')

  const { data, error } = await supabase
    .from('words')
    .select('word, phonetic, uk_phonetic, us_phonetic')
    .limit(10)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log('📊 测试数据：\n')

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

  // 统计
  const hasUK = data.filter(w => w.uk_phonetic).length
  const hasUS = data.filter(w => w.us_phonetic).length
  const hasBoth = data.filter(w => w.uk_phonetic && w.us_phonetic).length
  const hasOnlyPhonetic = data.filter(w => w.phonetic && !w.uk_phonetic && !w.us_phonetic).length

  console.log('📈 统计（前10条）：')
  console.log(`  有英标: ${hasUK}`)
  console.log(`  有美标: ${hasUS}`)
  console.log(`  同时有英标和美标: ${hasBoth}`)
  console.log(`  只有旧phonetic: ${hasOnlyPhonetic}`)
}

testPhoneticDisplay()
