import { readFileSync } from 'fs'
import { resolve } from 'path'

console.log('📊 新词库数据质量评估报告\n')
console.log('='.repeat(120))

// 读取新词库文件
const masterPoolData = JSON.parse(readFileSync('newwordfrommiao/master_words_pool.json', 'utf-8'))
const cet4Data = JSON.parse(readFileSync('newwordfrommiao/cet4_words.json', 'utf-8'))
const cet6Data = JSON.parse(readFileSync('newwordfrommiao/cet6_words.json', 'utf-8'))
const ieltsData = JSON.parse(readFileSync('newwordfrommiao/ielts_words.json', 'utf-8'))
const toeflData = JSON.parse(readFileSync('newwordfrommiao/toefl_words.json', 'utf-8'))
const k12Data = JSON.parse(readFileSync('newwordfrommiao/us_k12_foundation.json', 'utf-8'))
const livestreamData = JSON.parse(readFileSync('newwordfrommiao/livestream_pro.json', 'utf-8'))
const nailSalonData = JSON.parse(readFileSync('newwordfrommiao/nail_salon_pro.json', 'utf-8'))

// 提取单词数组
const datasets = {
  'Master Vocabulary 2026': masterPoolData.words || masterPoolData,
  'CET-4': cet4Data.words || cet4Data,
  'CET-6': cet6Data.words || cet6Data,
  'IELTS': ieltsData.words || ieltsData,
  'TOEFL': toeflData.words || toeflData,
  'US K-12': k12Data.words || k12Data,
  'Livestream Pro': livestreamData.words || livestreamData,
  'Nail Salon Pro': nailSalonData.words || nailSalonData
}

// 辅助函数：安全地检查字段是否有值
function hasValue(field) {
  if (!field) return false
  if (typeof field === 'string') return field.trim().length > 0
  if (typeof field === 'number') return true
  if (Array.isArray(field)) return field.length > 0
  return false
}

// 数据质量评估函数
function evaluateQuality(name, words) {
  const total = words.length
  const hasWord = words.filter(w => hasValue(w.word)).length
  const hasPhonetic = words.filter(w => hasValue(w.phonetic)).length
  const hasDefinition = words.filter(w => hasValue(w.definition)).length
  const hasExample = words.filter(w => hasValue(w.example)).length
  const hasPartOfSpeech = words.filter(w => hasValue(w.pos)).length
  const hasTranslation = words.filter(w => hasValue(w.translation)).length

  // 检查字段名称变体
  const hasPhoneticAlt = words.filter(w =>
    hasValue(w.phonetic) ||
    hasValue(w.phonetic_us) ||
    hasValue(w.phonetic_uk)
  ).length

  const hasDefinitionAlt = words.filter(w =>
    hasValue(w.definition) ||
    hasValue(w.cn) ||
    hasValue(w.meaning)
  ).length

  const hasExampleAlt = words.filter(w =>
    hasValue(w.example) ||
    hasValue(w.example_sentence) ||
    hasValue(w.sentence)
  ).length

  return {
    total,
    word: { count: hasWord, rate: (hasWord / total * 100).toFixed(1) },
    phonetic: { count: hasPhoneticAlt, rate: (hasPhoneticAlt / total * 100).toFixed(1) },
    definition: { count: hasDefinitionAlt, rate: (hasDefinitionAlt / total * 100).toFixed(1) },
    example: { count: hasExampleAlt, rate: (hasExampleAlt / total * 100).toFixed(1) },
    partOfSpeech: { count: hasPartOfSpeech, rate: (hasPartOfSpeech / total * 100).toFixed(1) },
    translation: { count: hasTranslation, rate: (hasTranslation / total * 100).toFixed(1) }
  }
}

// 评估所有数据集
console.log('\n📋 数据完整性评估\n')
console.log('─'.repeat(120))

Object.entries(datasets).forEach(([name, words]) => {
  const quality = evaluateQuality(name, words)

  console.log(`\n📚 ${name} (${quality.total} 词)`)
  console.log('─'.repeat(120))
  console.log(`字段名称          完整数量   完整率   评级`)
  console.log('─'.repeat(120))
  console.log(`单词 (word)        ${String(quality.word.count).padStart(6)}   ${quality.word.rate.padStart(6)}%   ${getRating(quality.word.rate)}`)
  console.log(`音标 (phonetic)    ${String(quality.phonetic.count).padStart(6)}   ${quality.phonetic.rate.padStart(6)}%   ${getRating(quality.phonetic.rate)}`)
  console.log(`释义 (definition)  ${String(quality.definition.count).padStart(6)}   ${quality.definition.rate.padStart(6)}%   ${getRating(quality.definition.rate)}`)
  console.log(`例句 (example)     ${String(quality.example.count).padStart(6)}   ${quality.example.rate.padStart(6)}%   ${getRating(quality.example.rate)}`)
  console.log(`词性 (pos)         ${String(quality.partOfSpeech.count).padStart(6)}   ${quality.partOfSpeech.rate.padStart(6)}%   ${getRating(quality.partOfSpeech.rate)}`)
  console.log(`翻译 (translation) ${String(quality.translation.count).padStart(6)}   ${quality.translation.rate.padStart(6)}%   ${getRating(quality.translation.rate)}`)
})

function getRating(rate) {
  const r = parseFloat(rate)
  if (r >= 90) return '⭐⭐⭐⭐⭐ 优秀'
  if (r >= 70) return '⭐⭐⭐⭐ 良好'
  if (r >= 50) return '⭐⭐⭐ 一般'
  if (r >= 30) return '⭐⭐ 较差'
  return '⭐ 差'
}

// 数据一致性评估
console.log('\n\n📊 数据一致性评估\n')
console.log('─'.repeat(120))

Object.entries(datasets).forEach(([name, words]) => {
  // 检查音标格式一致性
  const phonetics = words
    .filter(w => w.phonetic || w.phonetic_us || w.phonetic_uk)
    .map(w => w.phonetic || w.phonetic_us || w.phonetic_uk)
    .filter(p => typeof p === 'string') // 只处理字符串类型

  const withSlash = phonetics.filter(p => p.startsWith('/')).length
  const withBrackets = phonetics.filter(p => p.startsWith('[')).length
  const plain = phonetics.length - withSlash - withBrackets

  console.log(`\n📚 ${name}:`)
  if (phonetics.length > 0) {
    console.log(`  音标格式分布:`)
    console.log(`    /.../ 格式: ${withSlash} (${(withSlash/phonetics.length*100).toFixed(1)}%)`)
    console.log(`    [...] 格式: ${withBrackets} (${(withBrackets/phonetics.length*100).toFixed(1)}%)`)
    console.log(`    无标记格式: ${plain} (${(plain/phonetics.length*100).toFixed(1)}%)`)
  } else {
    console.log(`  音标格式: 无数据`)
  }
})

// 数据准确性抽样检查
console.log('\n\n🔍 数据准确性抽样检查\n')
console.log('─'.repeat(120))

Object.entries(datasets).forEach(([name, words]) => {
  console.log(`\n📚 ${name}:`)

  // 随机抽样5个单词检查
  const samples = words.slice(0, 5)

  samples.forEach((w, i) => {
    const wordText = typeof w.word === 'string' ? w.word : '未知'
    const phoneticText = (w.phonetic || w.phonetic_us || w.phonetic_uk) || '无'
    const definitionText = ((w.definition || w.cn || w.meaning) || '无').toString().substring(0, 60)

    console.log(`\n  ${i + 1}. ${wordText}`)
    console.log(`     音标: ${phoneticText}`)
    console.log(`     释义: ${definitionText}...`)

    // 检查常见问题
    const issues = []
    if (!w.word) issues.push('缺少单词')
    if (!(w.phonetic || w.phonetic_us || w.phonetic_uk)) issues.push('缺少音标')
    if (!(w.definition || w.cn || w.meaning)) issues.push('缺少释义')
    if (issues.length > 0) {
      console.log(`     ⚠️  ${issues.join(', ')}`)
    }
  })
})

// 数据丰富性评估
console.log('\n\n💎 数据丰富性评估\n')
console.log('─'.repeat(120))

Object.entries(datasets).forEach(([name, words]) => {
  // 检查是否有额外字段
  const firstWord = words[0]
  const standardFields = ['word', 'phonetic', 'definition', 'example', 'pos', 'translation']
  const extraFields = Object.keys(firstWord).filter(k => !standardFields.includes(k))

  console.log(`\n📚 ${name}:`)
  if (extraFields.length > 0) {
    console.log(`  额外字段: ${extraFields.join(', ')}`)
  } else {
    console.log(`  额外字段: 无（仅标准字段）`)
  }

  // 检查是否有标签系统
  if (firstWord.tag || firstWord.tags || firstWord.level || firstWord.frequency) {
    console.log(`  ✅ 包含标签/分类系统`)
    if (firstWord.tag) console.log(`     - tag: ${firstWord.tag}`)
    if (firstWord.level) console.log(`     - level: ${firstWord.level}`)
    if (firstWord.frequency) console.log(`     - frequency: ${firstWord.frequency}`)
  } else {
    console.log(`  ❌ 无标签/分类系统`)
  }
})

console.log('\n' + '='.repeat(120))
console.log('\n✅ 数据质量评估完成')
