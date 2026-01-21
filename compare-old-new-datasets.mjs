import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 读取环境变量
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

console.log('📊 新旧词库对比分析\n')
console.log('='.repeat(120))

// 读取新词库
const newCET4 = JSON.parse(readFileSync('newwordfrommiao/cet4_words.json', 'utf-8'))
const newTOEFL = JSON.parse(readFileSync('newwordfrommiao/toefl_words.json', 'utf-8'))

// 声明变量
let dbCET4Words = []
let dbTOEFLWords = []

console.log('\n🔍 分析维度1：单词级别的对比\n')
console.log('─'.repeat(120))

// 对比CET4
console.log('\n1️⃣ CET-4 词库对比\n')

const { data: dbCET4Books } = await supabase
  .from('books')
  .select('id, title, total_words')
  .eq('title', 'CET-4')

if (dbCET4Books && dbCET4Books.length > 0) {
  const dbCET4Book = dbCET4Books[0]
  console.log(`数据库中的CET-4: ${dbCET4Book.title}`)
  console.log(`  ID: ${dbCET4Book.id}`)
  console.log(`  总词数: ${dbCET4Book.total_words}`)

  // 先获取CET4的chapters
  const { data: cet4Chapters } = await supabase
    .from('chapters')
    .select('id')
    .eq('book_id', dbCET4Book.id)
    .limit(1)

  if (cet4Chapters && cet4Chapters.length > 0) {
    // 获取数据库中的CET4单词（前100个）
    const { data } = await supabase
      .from('words')
      .select('word, definition, phonetic')
      .eq('chapter_id', cet4Chapters[0].id)
      .limit(100)

    dbCET4Words = data || []
  }

  console.log(`  抽样词数: ${dbCET4Words.length}`)

  // 对比新旧单词
  const newCET4Words = newCET4.words || newCET4
  const newWordSet = new Set(newCET4Words.map(w => w.word.toLowerCase()))

  console.log(`\n新词库CET-4: ${newCET4Words.length} 词`)

  // 检查重复
  let duplicateCount = 0
  let sameDefinition = 0

  if (dbCET4Words) {
    dbCET4Words.forEach(dbWord => {
      if (newWordSet.has(dbWord.word.toLowerCase())) {
        duplicateCount++
        // 找到新词库中的对应单词
        const newWord = newCET4Words.find(w => w.word.toLowerCase() === dbWord.word.toLowerCase())
        if (newWord) {
          // 简单对比释义（取前50个字符）
          const dbDef = (dbWord.definition || '').substring(0, 50)
          const newDef = ((newWord.definition || newWord.translation) || '').substring(0, 50)

          if (dbDef === newDef) {
            sameDefinition++
          }
        }
      }
    })

    console.log(`\n📈 抽样对比结果 (前100词):`)
    console.log(`  单词重合率: ${duplicateCount}%`)
    console.log(`  释义相同率: ${sameDefinition}%`)
  }
}

// 对比TOEFL
console.log('\n\n2️⃣ TOEFL 词库对比\n')

const { data: dbTOEFLBooks } = await supabase
  .from('books')
  .select('id, title, total_words')
  .eq('title', 'TOEFL')

if (dbTOEFLBooks && dbTOEFLBooks.length > 0) {
  const dbTOEFLBook = dbTOEFLBooks[0]
  console.log(`数据库中的TOEFL: ${dbTOEFLBook.title}`)
  console.log(`  ID: ${dbTOEFLBook.id}`)
  console.log(`  总词数: ${dbTOEFLBook.total_words}`)

  // 先获取TOEFL的chapters
  const { data: toeflChapters } = await supabase
    .from('chapters')
    .select('id')
    .eq('book_id', dbTOEFLBook.id)
    .limit(1)

  if (toeflChapters && toeflChapters.length > 0) {
    const { data } = await supabase
      .from('words')
      .select('word, definition, phonetic')
      .eq('chapter_id', toeflChapters[0].id)
      .limit(100)

    dbTOEFLWords = data || []
  }

  console.log(`  抽样词数: ${dbTOEFLWords.length}`)

  const newTOEFLWords = newTOEFL.words || newTOEFL
  const newTOEFLWordSet = new Set(newTOEFLWords.map(w => w.word.toLowerCase()))

  console.log(`\n新词库TOEFL: ${newTOEFLWords.length} 词`)

  let duplicateCount = 0
  let sameDefinition = 0

  if (dbTOEFLWords) {
    dbTOEFLWords.forEach(dbWord => {
      if (newTOEFLWordSet.has(dbWord.word.toLowerCase())) {
        duplicateCount++
        const newWord = newTOEFLWords.find(w => w.word.toLowerCase() === dbWord.word.toLowerCase())
        if (newWord) {
          const dbDef = (dbWord.definition || '').substring(0, 50)
          const newDef = ((newWord.definition || newWord.translation) || '').substring(0, 50)

          if (dbDef === newDef) {
            sameDefinition++
          }
        }
      }
    })

    console.log(`\n📈 抽样对比结果 (前100词):`)
    console.log(`  单词重合率: ${duplicateCount}%`)
    console.log(`  释义相同率: ${sameDefinition}%`)
  }
}

console.log('\n\n🔍 分析维度2：字段对比\n')
console.log('─'.repeat(120))

// 对比字段丰富度
console.log('\n数据库CET-4单词字段:')
if (dbCET4Words && dbCET4Words.length > 0) {
  const sampleWord = dbCET4Words[0]
  Object.keys(sampleWord).forEach(key => {
    console.log(`  - ${key}`)
  })
}

console.log('\n新词库CET-4单词字段:')
const newCET4Sample = (newCET4.words || newCET4)[0]
Object.keys(newCET4Sample).forEach(key => {
  const value = newCET4Sample[key]
  const type = Array.isArray(value) ? `Array(${value.length})` : typeof value
  console.log(`  - ${key}: ${type}`)
})

console.log('\n\n🔍 分析维度3：数据质量对比\n')
console.log('─'.repeat(120))

// 统计数据库单词的字段完整性
if (dbCET4Words) {
  const hasPhonetic = dbCET4Words.filter(w => w.phonetic && w.phonetic.trim()).length
  const hasDefinition = dbCET4Words.filter(w => w.definition && w.definition.trim()).length

  console.log('\n数据库CET-4 (抽样100词):')
  console.log(`  有音标: ${hasPhonetic}/100 (${hasPhonetic}%)`)
  console.log(`  有释义: ${hasDefinition}/100 (${hasDefinition}%)`)
}

// 统计新词库单词的字段完整性
const newCET4WordsList = newCET4.words || newCET4
const sampleNew = newCET4WordsList.slice(0, 100)
const newHasPhonetic = sampleNew.filter(w => w.phonetic && w.phonetic.trim()).length
const newHasDefinition = sampleNew.filter(w =>
  (w.definition && w.definition.trim()) ||
  (w.translation && w.translation.trim())
).length
const newHasTranslation = sampleNew.filter(w => w.translation && w.translation.trim()).length

console.log('\n新词库CET-4 (抽样100词):')
console.log(`  有音标: ${newHasPhonetic}/100 (${newHasPhonetic}%)`)
console.log(`  有释义(英): ${newHasDefinition}/100 (${newHasDefinition}%)`)
console.log(`  有翻译(中): ${newHasTranslation}/100 (${newHasTranslation}%)`)

console.log('\n\n🔍 分析维度4：独特价值分析\n')
console.log('─'.repeat(120))

// 分析新词库的独特字段
console.log('\n新词库CET-4的独特优势:')
console.log('  ✅ 有柯林斯等级 (collins字段)')
console.log('  ✅ 有牛津等级 (oxford字段)')
console.log('  ✅ 有BNC语料库频率 (bnc字段)')
console.log('  ✅ 有词频数据 (frq字段)')
console.log('  ✅ 有标签系统 (tag字段，标明所属考试)')
console.log('  ✅ 有英英释义和中文翻译')

const sampleWithTag = newCET4WordsList.find(w => w.tag)
if (sampleWithTag) {
  console.log(`\n标签示例: ${sampleWithTag.word}`)
  console.log(`  tag: ${sampleWithTag.tag}`)
}

console.log('\n数据库CET-4的特点:')
console.log('  ✅ 已有章节结构 (可通过chapter学习)')
console.log('  ✅ 已有用户学习进度 (word_progress表)')
console.log('  ✅ 已融入系统，可直接使用')
console.log('  ❌ 缺少词频、等级等元数据')

console.log('\n' + '='.repeat(120))
