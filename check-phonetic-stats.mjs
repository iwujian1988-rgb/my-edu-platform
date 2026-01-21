import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPhoneticStats() {
  console.log('📊 查询音标数据统计...\n')

  // 查询总单词数
  const { count: total, error: totalError } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })

  if (totalError) {
    console.error('❌ 查询失败:', totalError)
    return
  }

  // 查询有uk_phonetic的单词数
  const { count: hasUk, error: ukError } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .not('uk_phonetic', 'is', null)
    .not('uk_phonetic', 'eq', '')

  // 查询有us_phonetic的单词数
  const { count: hasUs, error: usError } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .not('us_phonetic', 'is', null)
    .not('us_phonetic', 'eq', '')

  // 查询有uk或us的单词数
  const { count: hasUkOrUs, error: ukOrUsError } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .or('uk_phonetic.not.is.null,us_phonetic.not.is.null')

  // 查询只有旧phonetic的单词数
  const { count: onlyOld, error: onlyOldError } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .or('and(uk_phonetic.is.null,us_phonetic.is.null)')
    .not('phonetic', 'is', null)
    .not('phonetic', 'eq', '')

  // 查询没有音标的单词数
  const { count: noPhonetic, error: noPhoneticError } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .is('uk_phonetic', null)
    .is('us_phonetic', null)
    .or('phonetic.is.null,phonetic.eq.""')

  console.log('📈 统计结果:')
  console.log('═'.repeat(50))
  console.log(`总单词数:        ${total?.toLocaleString() || 0}`)
  console.log(`有英式音标:      ${hasUk?.toLocaleString() || 0} (${((hasUk/total)*100).toFixed(1)}%)`)
  console.log(`有美式音标:      ${hasUs?.toLocaleString() || 0} (${((hasUs/total)*100).toFixed(1)}%)`)
  console.log(`有英标或美标:    ${hasUkOrUs?.toLocaleString() || 0} (${((hasUkOrUs/total)*100).toFixed(1)}%)`)
  console.log(`只有旧phonetic:  ${onlyOld?.toLocaleString() || 0} (${((onlyOld/total)*100).toFixed(1)}%)`)
  console.log(`完全无音标:      ${noPhonetic?.toLocaleString() || 0} (${((noPhonetic/total)*100).toFixed(1)}%)`)
  console.log('═'.repeat(50))

  // 获取一些示例数据
  console.log('\n🔍 示例数据:')
  const { data: examples } = await supabase
    .from('words')
    .select('word, phonetic, uk_phonetic, us_phonetic')
    .or('uk_phonetic.not.is.null,us_phonetic.not.is.null')
    .limit(5)

  if (examples) {
    examples.forEach(w => {
      console.log(`\n单词: ${w.word}`)
      console.log(`  旧phonetic:   ${w.phonetic || '(无)'}`)
      console.log(`  英式音标:     ${w.uk_phonetic || '(无)'}`)
      console.log(`  美式音标:     ${w.us_phonetic || '(无)'}`)
    })
  }
}

checkPhoneticStats()
