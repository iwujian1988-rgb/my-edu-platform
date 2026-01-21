/**
 * 检查英标和美标音标字段
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUKUSPhonetic() {
  console.log('🔍 检查英标和美标音标字段\n')

  const { data, error } = await supabase
    .from('words')
    .select('word, phonetic, uk_phonetic, us_phonetic')
    .limit(15)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log('📊 示例数据：\n')

  let hasUK = 0
  let hasUS = 0
  let hasBoth = 0

  data.forEach(w => {
    if (w.uk_phonetic) hasUK++
    if (w.us_phonetic) hasUS++
    if (w.uk_phonetic && w.us_phonetic) hasBoth++

    const hasData = w.phonetic || w.uk_phonetic || w.us_phonetic
    if (hasData) {
      console.log(`  ${w.word}:`)
      if (w.phonetic) console.log(`    phonetic: ${w.phonetic}`)
      if (w.uk_phonetic) console.log(`    uk_phonetic: ${w.uk_phonetic}`)
      if (w.us_phonetic) console.log(`    us_phonetic: ${w.us_phonetic}`)
      console.log('')
    }
  })

  console.log('📊 统计（前15条）：')
  console.log(`  有英标: ${hasUK}`)
  console.log(`  有美标: ${hasUS}`)
  console.log(`  同时有英标和美标: ${hasBoth}`)
}

checkUKUSPhonetic()
