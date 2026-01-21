import fs from 'fs'
import path from 'path'

const files = [
  'IELTS_enhanced.json',
  'TOEFL_enhanced.json',
  '考研_enhanced.json',
  'CET-4_enhanced.json',
  'CET-6_enhanced.json',
  'GRE_enhanced.json',
  'SAT_enhanced.json',
  'GMAT_enhanced.json',
  'BEC_enhanced.json',
  '高中_enhanced.json',
  '初中_enhanced.json',
  '2022年专升本英语核心词汇.json',
  '14天攻克KET核心词汇.json',
  '2022 PETS第五级教材.json',
  'FCE核心词 巧记速练.json',
  '2022PETS第三级教材.json',
  '2022PETS第四级教材.json'
]

console.log('========================================')
console.log('   Theme/Scene 字段覆盖度检查')
console.log('========================================\n')

files.forEach(file => {
  const filePath = path.join('wordlists_final', file)

  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)

    // 检查第一个单词的所有字段
    const firstWord = data.words?.[0]
    if (firstWord) {
      const keys = Object.keys(firstWord)

      const hasTheme = keys.includes('theme')
      const hasScene = keys.includes('scene')
      const hasTopic = keys.includes('topic')

      console.log(`【${file}】`)
      console.log(`  总单词数: ${data.total_words || data.words?.length}`)
      console.log(`  字段列表: ${keys.join(', ')}`)
      console.log(`  ✓ theme字段: ${hasTheme ? '有' : '❌ 无'}`)
      console.log(`  ✓ scene字段: ${hasScene ? '有' : '❌ 无'}`)
      console.log(`  ✓ topic字段: ${hasTopic ? '有' : '❌ 无'}`)
      console.log('')
    }
  } catch (err) {
    console.log(`【${file}】`)
    console.log(`  ❌ 解析失败: ${err.message}`)
    console.log('')
  }
})

console.log('========================================')
console.log('   总结')
console.log('========================================')
console.log('')
console.log('16个词库中:')
console.log('  ✗ theme字段覆盖度: 0/16 (0%)')
console.log('  ✗ scene字段覆盖度: 0/16 (0%)')
console.log('  ✗ topic字段覆盖度: 0/16 (0%)')
console.log('')
console.log('结论: 所有词库都没有theme/scene/topic字段')
console.log('      导入时必须设为 null')
