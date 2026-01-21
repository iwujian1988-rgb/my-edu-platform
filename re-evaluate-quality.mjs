import { readFileSync } from 'fs'

console.log('🔍 重新评估数据质量 - 正确解析字段\n')
console.log('='.repeat(120))

function checkDataset(filename, name) {
  const data = JSON.parse(readFileSync(filename, 'utf-8'))
  const words = data.words || data

  console.log(`\n📚 ${name} (${words.length} 词)\n`)
  console.log('─'.repeat(120))

  let hasWord = 0
  let hasPhonetic = 0
  let hasMeaningCN = 0
  let hasMeaningEN = 0
  let hasDefinition = 0
  let hasExample = 0
  let hasTranslation = 0

  words.forEach(w => {
    if (w.word) hasWord++

    // 检查音标
    if (w.phonetic) {
      if (typeof w.phonetic === 'object') {
        // 对象格式: {kk: "xx", mw: "xx", ipa: "xx"}
        if (w.phonetic.kk || w.phonetic.mw || w.phonetic.ipa || w.phonetic.us || w.phonetic.uk) {
          hasPhonetic++
        }
      } else if (typeof w.phonetic === 'string' && w.phonetic.trim()) {
        hasPhonetic++
      }
    }

    // 检查definitions数组
    if (w.definitions && Array.isArray(w.definitions) && w.definitions.length > 0) {
      const def = w.definitions[0]

      // 检查各种释义字段
      if (def.meaning_cn && def.meaning_cn.trim()) hasMeaningCN++
      if (def.meaning_en && def.meaning_en.trim()) hasMeaningEN++
      if (def.meaning_en_simple && def.meaning_en_simple.trim()) hasMeaningEN++
      if (def.meaning_en_academic && def.meaning_en_academic.trim()) hasMeaningEN++

      // 检查例句
      if (def.examples && Array.isArray(def.examples) && def.examples.length > 0) {
        // 检查是否有实际的例句内容
        const hasRealExample = def.examples.some(ex =>
          (ex.sentence_en && ex.sentence_en.trim()) ||
          (ex.sentence_cn && ex.sentence_cn.trim())
        )
        if (hasRealExample) hasExample++
      }
    }

    // 检查传统格式的definition
    if (w.definition && w.definition.trim()) {
      hasDefinition++
      hasMeaningEN++ // 英文释义也算
    }

    // 检查翻译
    if (w.translation && w.translation.trim()) hasTranslation++
  })

  console.log(`字段                        有数量   完整率   评级`)
  console.log('─'.repeat(120))
  console.log(`单词 (word)                  ${String(hasWord).padStart(6)}   ${(hasWord/words.length*100).toFixed(1).padStart(6)}%   ${getRating(hasWord/words.length*100)}`)
  console.log(`音标 (phonetic)              ${String(hasPhonetic).padStart(6)}   ${(hasPhonetic/words.length*100).toFixed(1).padStart(6)}%   ${getRating(hasPhonetic/words.length*100)}`)
  console.log(`中文释义 (meaning_cn)        ${String(hasMeaningCN).padStart(6)}   ${(hasMeaningCN/words.length*100).toFixed(1).padStart(6)}%   ${getRating(hasMeaningCN/words.length*100)}`)
  console.log(`英文释义 (meaning_en)        ${String(hasMeaningEN).padStart(6)}   ${(hasMeaningEN/words.length*100).toFixed(1).padStart(6)}%   ${getRating(hasMeaningEN/words.length*100)}`)
  console.log(`传统释义 (definition)        ${String(hasDefinition).padStart(6)}   ${(hasDefinition/words.length*100).toFixed(1).padStart(6)}%   ${getRating(hasDefinition/words.length*100)}`)
  console.log(`例句 (examples)              ${String(hasExample).padStart(6)}   ${(hasExample/words.length*100).toFixed(1).padStart(6)}%   ${getRating(hasExample/words.length*100)}`)
  console.log(`翻译 (translation)          ${String(hasTranslation).padStart(6)}   ${(hasTranslation/words.length*100).toFixed(1).padStart(6)}%   ${getRating(hasTranslation/words.length*100)}`)

  return {
    hasWord,
    hasPhonetic,
    hasMeaningCN,
    hasMeaningEN,
    hasDefinition,
    hasExample,
    hasTranslation
  }
}

function getRating(rate) {
  const r = parseFloat(rate)
  if (r >= 90) return '⭐⭐⭐⭐⭐ 优秀'
  if (r >= 70) return '⭐⭐⭐⭐ 良好'
  if (r >= 50) return '⭐⭐⭐ 一般'
  if (r >= 30) return '⭐⭐ 较差'
  return '⭐ 差'
}

// 检查所有词库
checkDataset('newwordfrommiao/livestream_pro.json', 'Livestream Pro')
checkDataset('newwordfrommiao/nail_salon_pro.json', 'Nail Salon Pro')
checkDataset('newwordfrommiao/us_k12_foundation.json', 'US K-12')

console.log('\n' + '='.repeat(120))
