import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 读取 .env.local 文件
const envPath = resolve('.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    const [, key, value] = match
    envVars[key] = value.replace(/^["']|["']$/g, '')
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 检查单词重复情况...\n')

// 读取新词库文件
const masterPoolData = JSON.parse(readFileSync('newwordfrommiao/master_words_pool.json', 'utf-8'))
const cet4Data = JSON.parse(readFileSync('newwordfrommiao/cet4_words.json', 'utf-8'))
const livestreamData = JSON.parse(readFileSync('newwordfrommiao/livestream_pro.json', 'utf-8'))
const nailSalonData = JSON.parse(readFileSync('newwordfrommiao/nail_salon_pro.json', 'utf-8'))

// 提取单词数组（处理不同格式）
const masterPool = masterPoolData.words || masterPoolData
const cet4 = cet4Data.words || cet4Data
const livestream = livestreamData.words || livestreamData
const nailSalon = nailSalonData.words || nailSalonData

console.log('📊 新词库统计:')
console.log(`  Master Pool: ${masterPool.length} 词`)
console.log(`  CET-4: ${cet4.length} 词`)
console.log(`  Livestream Pro: ${livestream.length} 词`)
console.log(`  Nail Salon Pro: ${nailSalon.length} 词`)

// 提取单词列表
const newWords = {
  master: new Set(masterPool.map(w => w.word.toLowerCase())),
  cet4: new Set(cet4.map(w => w.word.toLowerCase())),
  livestream: new Set(livestream.map(w => w.word.toLowerCase())),
  nailSalon: new Set(nailSalon.map(w => w.word.toLowerCase()))
}

console.log('\n🔍 查询数据库中现有单词...\n')

// 查询数据库中的所有单词（分批查询避免超时）
const { data: dbWords, error } = await supabase
  .from('words')
  .select('word')

if (error) {
  console.error('❌ 查询失败:', error)
  process.exit(1)
}

const dbWordSet = new Set(dbWords.map(w => w.word.toLowerCase()))

console.log(`✅ 数据库中共有 ${dbWords.length.toLocaleString()} 个单词\n`)

// 检查重复
console.log('📈 重复情况分析:\n')

const checkDuplicates = (name, wordSet) => {
  let duplicates = 0
  let newWords = 0
  const sampleDuplicates = []
  const sampleNew = []

  wordSet.forEach(word => {
    if (dbWordSet.has(word)) {
      duplicates++
      if (sampleDuplicates.length < 5) {
        sampleDuplicates.push(word)
      }
    } else {
      newWords++
      if (sampleNew.length < 5) {
        sampleNew.push(word)
      }
    }
  })

  const percentage = ((duplicates / wordSet.size) * 100).toFixed(1)

  console.log(`📚 ${name}:`)
  console.log(`   总数: ${wordSet.size}`)
  console.log(`   数据库已有: ${duplicates} (${percentage}%)`)
  console.log(`   新增单词: ${newWords}`)
  if (sampleDuplicates.length > 0) {
    console.log(`   重复示例: ${sampleDuplicates.join(', ')}`)
  }
  if (sampleNew.length > 0) {
    console.log(`   新增示例: ${sampleNew.join(', ')}`)
  }
  console.log('')

  return { duplicates, newWords }
}

checkDuplicates('Master Vocabulary 2026', newWords.master)
checkDuplicates('CET-4', newWords.cet4)
checkDuplicates('Livestream Pro', newWords.livestream)
checkDuplicates('Nail Salon Pro', newWords.nailSalon)

// 总计
const totalNewWords = newWords.master.size + newWords.cet4.size + newWords.livestream.size + newWords.nailSalon.size
console.log(`\n📊 总结:`)
console.log(`   新词库总单词数: ${totalNewWords}`)
console.log(`   数据库现有单词: ${dbWords.length.toLocaleString()}`)
