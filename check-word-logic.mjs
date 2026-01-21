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

console.log('🔍 检查单词在不同词库中的存储逻辑...\n')

// 查看words表结构
console.log('📋 1. 查看words表的结构（通过示例数据）\n')

const { data: sampleWords, error: sampleError } = await supabase
  .from('words')
  .select('*')
  .limit(5)

if (sampleError) {
  console.error('❌ 查询失败:', sampleError)
} else {
  console.log('✅ words表示例数据:')
  console.log('─'.repeat(120))
  sampleWords.forEach(word => {
    console.log(`ID: ${word.id}`)
    console.log(`  word: ${word.word}`)
    console.log(`  book_id: ${word.book_id}`)
    console.log(`  chapter_id: ${word.chapter_id}`)
    console.log(`  definition: ${word.definition?.substring(0, 50)}...`)
    console.log(`  phonetic: ${word.phonetic}`)
    console.log('─'.repeat(120))
  })
}

// 检查同一个单词在不同书中的情况
console.log('\n🔎 2. 检查单词"abandon"在不同词库中的存储\n')

const { data: abandonWords, error: abandonError } = await supabase
  .from('words')
  .select('*')
  .ilike('word', 'abandon')

if (abandonError) {
  console.error('❌ 查询失败:', abandonError)
} else {
  console.log(`✅ 找到 ${abandonWords.length} 个"abandon"记录:\n`)

  abandonWords.forEach((word, index) => {
    console.log(`${index + 1}. ID: ${word.id}`)
    console.log(`   word: ${word.word}`)
    console.log(`   book_id: ${word.book_id}`)
    console.log(`   chapter_id: ${word.chapter_id}`)
    console.log(`   definition: ${word.definition}`)
    console.log(`   phonetic: ${word.phonetic}`)
    console.log(`   example_sentence: ${word.example_sentence}`)
    console.log('')
  })
}

// 获取这些word对应的book信息
if (abandonWords.length > 0) {
  const bookIds = [...new Set(abandonWords.map(w => w.book_id))]

  console.log('📚 这些单词所属的词库:\n')
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('id, title, description')
    .in('id', bookIds)

  if (!booksError && books) {
    books.forEach(book => {
      console.log(`  - ${book.title} (ID: ${book.id})`)
      const wordsInBook = abandonWords.filter(w => w.book_id === book.id)
      console.log(`    该书中"abandon"的数量: ${wordsInBook.length}`)
    })
  }
}

// 统计：查看有多少单词在多本书中出现
console.log('\n📊 3. 统计单词在多本书中出现的频率\n')

const { data: allWords, error: allWordsError } = await supabase
  .from('words')
  .select('word, book_id')
  .limit(10000)

if (!allWordsError && allWords) {
  // 按word分组
  const wordMap = {}
  allWords.forEach(({ word, book_id }) => {
    if (!wordMap[word]) {
      wordMap[word] = new Set()
    }
    wordMap[word].add(book_id)
  })

  // 统计
  let singleBook = 0
  let multiBook = 0
  const examples = {}

  Object.entries(wordMap).forEach(([word, books]) => {
    if (books.size === 1) {
      singleBook++
    } else {
      multiBook++
      if (Object.keys(examples).length < 5) {
        examples[word] = books.size
      }
    }
  })

  console.log(`总单词数: ${Object.keys(wordMap).length}`)
  console.log(`只在1本书中出现: ${singleBook}`)
  console.log(`在多本书中出现: ${multiBook}`)
  console.log('\n在多本书中出现的示例:')
  Object.entries(examples).forEach(([word, count]) => {
    console.log(`  "${word}" 出现在 ${count} 本书`)
  })
}

console.log('\n' + '='.repeat(120))
