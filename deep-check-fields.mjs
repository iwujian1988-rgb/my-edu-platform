import { readFileSync } from 'fs'

console.log('🔍 深度检查字段结构\n')
console.log('='.repeat(120))

// 检查Livestream Pro
console.log('\n1️⃣ Livestream Pro - 深度字段检查\n')
console.log('─'.repeat(120))

const livestream = JSON.parse(readFileSync('newwordfrommiao/livestream_pro.json', 'utf-8'))
const livestreamWords = livestream.words || livestream

console.log('总词数:', livestreamWords.length)
console.log('\n第一个单词的完整字段列表:')
const firstLivestream = livestreamWords[0]
Object.keys(firstLivestream).forEach(key => {
  const value = firstLivestream[key]
  const type = Array.isArray(value) ? 'Array' : typeof value
  const preview = Array.isArray(value)
    ? `[Array, length=${value.length}]`
    : type === 'object'
    ? JSON.stringify(value).substring(0, 100)
    : String(value).substring(0, 100)

  console.log(`  ${key}: ${type}`)
  console.log(`    值: ${preview}${preview.length >= 100 ? '...' : ''}`)
})

console.log('\n\n详细分析第一个单词:')
console.log(JSON.stringify(firstLivestream, null, 2))

console.log('\n\n第二个单词:')
const secondLivestream = livestreamWords[1]
console.log(JSON.stringify(secondLivestream, null, 2))

// 检查Nail Salon Pro
console.log('\n\n2️⃣ Nail Salon Pro - 深度字段检查\n')
console.log('─'.repeat(120))

const nailSalon = JSON.parse(readFileSync('newwordfrommiao/nail_salon_pro.json', 'utf-8'))
const nailSalonWords = nailSalon.words || nailSalon

console.log('总词数:', nailSalonWords.length)
console.log('\n第一个单词的完整字段列表:')
const firstNail = nailSalonWords[0]
Object.keys(firstNail).forEach(key => {
  const value = firstNail[key]
  const type = Array.isArray(value) ? 'Array' : typeof value
  const preview = Array.isArray(value)
    ? `[Array, length=${value.length}]`
    : type === 'object'
    ? JSON.stringify(value).substring(0, 100)
    : String(value).substring(0, 100)

  console.log(`  ${key}: ${type}`)
  console.log(`    值: ${preview}${preview.length >= 100 ? '...' : ''}`)
})

console.log('\n\n详细分析第一个单词:')
console.log(JSON.stringify(firstNail, null, 2))

// 检查US K-12
console.log('\n\n3️⃣ US K-12 - 深度字段检查\n')
console.log('─'.repeat(120))

const k12 = JSON.parse(readFileSync('newwordfrommiao/us_k12_foundation.json', 'utf-8'))
const k12Words = k12.words || k12

console.log('总词数:', k12Words.length)
console.log('\n第一个单词的完整字段列表:')
const firstK12 = k12Words[0]
Object.keys(firstK12).forEach(key => {
  const value = firstK12[key]
  const type = Array.isArray(value) ? 'Array' : typeof value
  const preview = Array.isArray(value)
    ? `[Array, length=${value.length}]`
    : type === 'object'
    ? JSON.stringify(value).substring(0, 100)
    : String(value).substring(0, 100)

  console.log(`  ${key}: ${type}`)
  console.log(`    值: ${preview}${preview.length >= 100 ? '...' : ''}`)
})

console.log('\n\n详细分析第一个单词:')
console.log(JSON.stringify(firstK12, null, 2))
