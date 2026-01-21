import { readFileSync } from 'fs'

console.log('🔍 抽样查看单词质量\n')

// Livestream Pro - 抽样查看有中文释义的单词
console.log('1️⃣ Livestream Pro - 查看有中文释义的单词\n')
console.log('─'.repeat(120))

const livestream = JSON.parse(readFileSync('newwordfrommiao/livestream_pro.json', 'utf-8'))
const livestreamWords = livestream.words || livestream

// 找前5个有中文释义的单词
let count = 0
for (const w of livestreamWords) {
  if (w.definitions && w.definitions[0] && w.definitions[0].meaning_cn && w.definitions[0].meaning_cn.trim()) {
    count++
    console.log(`\n${count}. ${w.word}`)
    console.log(`   音标: ${JSON.stringify(w.phonetic)}`)
    console.log(`   中文释义: ${w.definitions[0].meaning_cn}`)
    if (w.definitions[0].examples && w.definitions[0].examples.length > 0) {
      console.log(`   例句数: ${w.definitions[0].examples.length}`)
      console.log(`   例句1: ${w.definitions[0].examples[0].sentence_en}`)
      console.log(`   翻译1: ${w.definitions[0].examples[0].sentence_cn}`)
    }
    if (count >= 5) break
  }
}

// Nail Salon Pro - 抽样查看
console.log('\n\n2️⃣ Nail Salon Pro - 查看有中文释义的单词\n')
console.log('─'.repeat(120))

const nailSalon = JSON.parse(readFileSync('newwordfrommiao/nail_salon_pro.json', 'utf-8'))
const nailSalonWords = nailSalon.words || nailSalon

count = 0
for (const w of nailSalonWords) {
  if (w.definitions && w.definitions[0] && w.definitions[0].meaning_cn && w.definitions[0].meaning_cn.trim()) {
    count++
    console.log(`\n${count}. ${w.word}`)
    console.log(`   音标: ${JSON.stringify(w.phonetic)}`)
    console.log(`   中文释义: ${w.definitions[0].meaning_cn}`)
    if (w.definitions[0].examples && w.definitions[0].examples.length > 0) {
      console.log(`   例句数: ${w.definitions[0].examples.length}`)
      console.log(`   例句1: ${w.definitions[0].examples[0].sentence_en}`)
      console.log(`   翻译1: ${w.definitions[0].examples[0].sentence_cn}`)
    }
    if (count >= 5) break
  }
}

// 查看没有中文释义的单词
console.log('\n\n3️⃣ Livestream Pro - 查看没有中文释义的单词\n')
console.log('─'.repeat(120))

count = 0
for (const w of livestreamWords) {
  if (w.definitions && w.definitions[0] && (!w.definitions[0].meaning_cn || !w.definitions[0].meaning_cn.trim())) {
    count++
    console.log(`\n${count}. ${w.word}`)
    console.log(`   英文释义: ${w.definitions[0].meaning_en_simple || w.definitions[0].meaning_en_academic || '无'}`)
    if (w.definitions[0].examples && w.definitions[0].examples.length > 0) {
      console.log(`   例句1: ${w.definitions[0].examples[0].sentence_en}`)
      console.log(`   翻译1: ${w.definitions[0].examples[0].sentence_cn || '无中文'}`)
    }
    if (count >= 3) break
  }
}
