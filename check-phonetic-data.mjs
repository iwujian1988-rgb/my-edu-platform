/**
 * 检查原始数据中的音标情况
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const WORDLIST_DIR = './wordlists_final'

const files = [
  'IELTS_enhanced.json',
  'TOEFL_enhanced.json',
  'CET-4_enhanced.json',
  '14天攻克KET核心词汇.json',
  '2022年专升本英语核心词汇.json'
]

console.log('🔍 检查原始数据中的音标情况\n')
console.log('='.repeat(80))

files.forEach(file => {
  console.log(`\n📚 ${file}`)
  console.log('─'.repeat(80))

  const filePath = resolve(WORDLIST_DIR, file)
  const data = JSON.parse(readFileSync(filePath, 'utf-8'))

  // 检查前3个单词
  const samples = data.words.slice(0, 3)

  samples.forEach((word, i) => {
    console.log(`\n${i + 1}. ${word.word}`)
    console.log(`   uk_phonetic: ${word.uk_phonetic || '(无)'}`)
    console.log(`   us_phonetic: ${word.us_phonetic || '(无)'}`)
  })

  // 统计音标覆盖率
  let withPhonetic = 0
  data.words.forEach(w => {
    if (w.uk_phonetic || w.us_phonetic) {
      withPhonetic++
    }
  })

  const coverage = Math.round(withPhonetic / data.words.length * 100)
  console.log(`\n📊 音标覆盖率: ${withPhonetic}/${data.words.length} (${coverage}%)`)
})

console.log('\n' + '='.repeat(80))
