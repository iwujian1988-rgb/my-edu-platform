/**
 * 检查音标字段数据
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPhonetic() {
  console.log('🔍 检查音标字段数据结构\n')

  const { data, error } = await supabase
    .from('words')
    .select('word, phonetic')
    .not('phonetic', 'is', null)
    .limit(50)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log('📊 音标示例（前20个）：\n')
  data.slice(0, 20).forEach(w => {
    console.log(`  ${w.word.padEnd(15)} ${w.phonetic}`)
  })

  // 检查是否有包含两个音标的记录
  const withMultiple = data.filter(w => {
    const ph = w.phonetic || ''
    return ph.includes('UK') || ph.includes('US') || ph.includes('英') || ph.includes('美') || ph.includes(';') || ph.includes(',')
  })

  console.log(`\n\n🔍 检查包含两个音标的单词：`)
  console.log(`包含多个音标的单词数量: ${withMultiple.length}`)

  if (withMultiple.length > 0) {
    console.log('\n示例：')
    withMultiple.slice(0, 10).forEach(w => {
      console.log(`  ${w.word}: ${w.phonetic}`)
    })
  } else {
    console.log('\n❌ 数据库中没有找到包含两个音标的单词')
    console.log('\n💡 说明：')
    console.log('  - 当前 phonetic 字段只存储单个音标')
    console.log('  - 如果需要英标和美标，需要添加 phonetic_uk 和 phonetic_us 字段')
  }
}

checkPhonetic()
