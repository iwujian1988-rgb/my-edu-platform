/**
 * 检查E175单词字段长度
 */

import fs from 'fs'

const jsonFile = './linshi/InnerFrench 中级法语_processed/E175 L\'aide médicale à mourir, bientôt possible en France_materials.json'
const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'))
const unitKey = Object.keys(jsonData.materials)[0]
const unit = jsonData.materials[unitKey]
const vocab = unit.language_analysis?.vocabulary || []

console.log('🔍 检查E175单词字段长度')
console.log('========================================\n')

vocab.forEach((v: any, i: number) => {
  const word = v.french || ''
  const chinese = v.chinese || ''
  const ipa = v.ipa || ''
  const pos = v.part_of_speech || ''

  console.log(`${i + 1}. ${word}`)
  console.log(`   Chinese (${chinese.length} chars): ${chinese.substring(0, 50)}${chinese.length > 50 ? '...' : ''}`)
  console.log(`   IPA (${ipa.length} chars): ${ipa.substring(0, 50)}${ipa.length > 50 ? '...' : ''}`)
  console.log(`   POS (${pos.length} chars): ${pos.substring(0, 50)}${pos.length > 50 ? '...' : ''}`)

  if (chinese.length > 255) {
    console.log(`   ⚠️  Chinese too long for varchar(255)`)
  }
  if (ipa.length > 20) {
    console.log(`   ⚠️  IPA too long for varchar(20)`)
  }
  if (pos.length > 20) {
    console.log(`   ⚠️  POS too long for varchar(20)`)
  }
  console.log('')
})
