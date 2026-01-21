/**
 * 检查所有单词的英标和美标数据
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllPhonetic() {
  console.log('🔍 检查所有单词的音标数据\n')

  // 查询所有有uk_phonetic或us_phonetic的单词
  const { data, error } = await supabase
    .from('words')
    .select('word, phonetic, uk_phonetic, us_phonetic')
    .or('uk_phonetic.not.is.null,us_phonetic.not.is.null')
    .limit(50)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log(`📊 找到 ${data.length} 个有英标或美标的单词\n`)

  if (data.length > 0) {
    console.log('示例数据：\n')
    data.slice(0, 20).forEach(w => {
      console.log(`${w.word}:`)
      if (w.phonetic) console.log(`  phonetic: ${w.phonetic}`)
      if (w.uk_phonetic) console.log(`  uk_phonetic: ${w.uk_phonetic}`)
      if (w.us_phonetic) console.log(`  us_phonetic: ${w.us_phonetic}`)
      console.log('')
    })
  } else {
    console.log('❌ 没有找到有英标或美标的单词')

    // 检查总数
    const { count } = await supabase
      .from('words')
      .select('word', { count: 'exact', head: true })

    console.log(`\n📊 数据库总单词数: ${count}`)
  }
}

checkAllPhonetic()
