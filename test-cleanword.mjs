/**
 * 测试cleanWord函数
 */

import { cleanWord } from './src/lib/batch-upload/video-processor.mjs'
import fs from 'fs'

// 读取E174的JSON
const e174Json = JSON.parse(fs.readFileSync('./linshi/InnerFrench 中级法语_processed/E174 Apprendre le français en immersion dans l' + 'Utah_materials.json', 'utf-8'))
const e174Vocab = e174Json.materials.unit_1.language_analysis.vocabulary

// 读取E176的JSON
const e176Json = JSON.parse(fs.readFileSync('./linshi/InnerFrench 中级法语_processed/E176 À la découverte des côtes normandes et bretonnes_materials.json', 'utf-8'))
const e176Vocab = e176Json.materials.unit_1.language_analysis.vocabulary

console.log('🧪 测试cleanWord函数')
console.log('========================================\n')

console.log('E174的单词:')
for (let i = 0; i < Math.min(5, e174Vocab.length); i++) {
  const v = e174Vocab[i]
  const cleaned = cleanWord(v.french)
  console.log(`  ${v.french} -> ${cleaned || '(被过滤)'}`)
}

console.log('\nE176的单词:')
for (let i = 0; i < Math.min(5, e176Vocab.length); i++) {
  const v = e176Vocab[i]
  const cleaned = cleanWord(v.french)
  console.log(`  ${v.french} -> ${cleaned || '(被过滤)'}`)
})

// 统计过滤后数量
const e174Cleaned = e174Vocab.map(v => cleanWord(v.french)).filter(w => w)
const e176Cleaned = e176Vocab.map(v => cleanWord(v.french)).filter(w => w)

console.log('\n📊 统计:')
console.log(`E174: ${e174Vocab.length} -> ${e174Cleaned.length}`)
console.log(`E176: ${e176Vocab.length} -> ${e176Cleaned.length}`)