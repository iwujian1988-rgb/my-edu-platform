import { readFileSync } from 'fs'

console.log('🔍 查看新词库的实际数据结构\n')

// 查看Master Pool
console.log('1️⃣ Master Vocabulary 2026 - 前3个单词的完整结构:\n')
console.log('─'.repeat(120))

const masterPool = JSON.parse(readFileSync('newwordfrommiao/master_words_pool.json', 'utf-8'))
const words = masterPool.words || masterPool

words.slice(0, 3).forEach((w, i) => {
  console.log(`\n单词 ${i + 1}:`)
  console.log(JSON.stringify(w, null, 2))
})

// 查看Livestream Pro
console.log('\n\n2️⃣ Livestream Pro - 前3个单词的完整结构:\n')
console.log('─'.repeat(120))

const livestream = JSON.parse(readFileSync('newwordfrommiao/livestream_pro.json', 'utf-8'))
const livestreamWords = livestream.words || livestream

livestreamWords.slice(0, 3).forEach((w, i) => {
  console.log(`\n单词 ${i + 1}:`)
  console.log(JSON.stringify(w, null, 2))
})

// 查看CET-4
console.log('\n\n3️⃣ CET-4 - 前2个单词的完整结构:\n')
console.log('─'.repeat(120))

const cet4 = JSON.parse(readFileSync('newwordfrommiao/cet4_words.json', 'utf-8'))
const cet4Words = cet4.words || cet4

cet4Words.slice(0, 2).forEach((w, i) => {
  console.log(`\n单词 ${i + 1}:`)
  console.log(JSON.stringify(w, null, 2))
})
