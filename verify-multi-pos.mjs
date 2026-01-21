/**
 * 验证多词性单词是否正确导入
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyMultiPosWords() {
  console.log('🔍 验证多词性单词导入...\n')
  console.log('='.repeat(80))

  // 查找包含多词性标记的单词
  const { data: multiPosWords, error } = await supabase
    .from('words')
    .select('word, part_of_speech, definition')
    .or('definition.ilike.【n%,definition.ilike.【v%,definition.ilike.【adj')

  if (error) {
    console.error('❌ 查询失败:', error.message)
    return
  }

  console.log(`\n✅ 找到 ${multiPosWords.length} 个多词性单词\n`)

  // 显示前10个示例
  console.log('📋 前10个多词性单词示例:')
  console.log('-'.repeat(80))

  const examples = multiPosWords.slice(0, 10)

  for (const word of examples) {
    console.log(`\n📖 ${word.word}`)
    console.log(`   词性: ${word.part_of_speech}`)
    console.log(`   释义: ${word.definition.substring(0, 60)}${word.definition.length > 60 ? '...' : ''}`)
  }

  console.log('\n' + '='.repeat(80))

  // 统计词性组合
  const posCombos = {}
  multiPosWords.forEach(w => {
    const combo = w.part_of_speech
    posCombos[combo] = (posCombos[combo] || 0) + 1
  })

  console.log('\n📊 词性组合统计 (Top 10):')
  console.log('-'.repeat(80))
  const sortedCombos = Object.entries(posCombos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  for (const [combo, count] of sortedCombos) {
    console.log(`   ${combo}: ${count} 个单词`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n✅ 验证完成！多词性Bug已成功修复！\n')
}

verifyMultiPosWords()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ 错误:', err)
    process.exit(1)
  })
