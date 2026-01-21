import { readFileSync } from 'fs'

console.log('🔍 检查例句翻译质量\n')
console.log('='.repeat(120))

function checkTranslationQuality(filename, name) {
  const data = JSON.parse(readFileSync(filename, 'utf-8'))
  const words = data.words || data

  console.log(`\n📚 ${name}\n`)
  console.log('─'.repeat(120))

  let count = 0
  let badTranslation = 0

  for (const w of words) {
    if (w.definitions && w.definitions[0] && w.definitions[0].examples && w.definitions[0].examples.length > 0) {
      const example = w.definitions[0].examples[0]
      const meaningCN = w.definitions[0].meaning_cn || ''

      if (example.sentence_cn && example.sentence_en) {
        count++

        // 检查翻译是否包含完整的中文释义
        if (meaningCN && meaningCN.length > 5 && example.sentence_cn.includes(meaningCN.substring(0, 5))) {
          badTranslation++
          if (badTranslation <= 3) {
            console.log(`\n❌ 单词: ${w.word}`)
            console.log(`   中文释义: ${meaningCN}`)
            console.log(`   英文例句: ${example.sentence_en}`)
            console.log(`   中文翻译: ${example.sentence_cn}`)
            console.log(`   ⚠️  翻译直接包含释义，可能是自动生成的`)
          }
        }
      }
    }

    if (count >= 20) break
  }

  console.log(`\n📊 统计:`)
  console.log(`   检查例句数: ${count}`)
  console.log(`   疑似错误翻译: ${badTranslation}`)
  console.log(`   错误率: ${(badTranslation/count*100).toFixed(1)}%`)
}

// 检查所有词库
checkTranslationQuality('newwordfrommiao/livestream_pro.json', 'Livestream Pro')
checkTranslationQuality('newwordfrommiao/nail_salon_pro.json', 'Nail Salon Pro')
checkTranslationQuality('newwordfrommiao/us_k12_foundation.json', 'US K-12')

console.log('\n' + '='.repeat(120))
