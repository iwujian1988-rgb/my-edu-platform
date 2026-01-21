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

console.log('🔍 检查abandon这个词在哪几本书中...\n')

// 查找abandon单词
const { data: abandonWords } = await supabase
  .from('words')
  .select('id, word, definition, chapter_id')
  .ilike('word', 'abandon')

console.log(`找到 ${abandonWords.length} 个"abandon"记录\n`)

// 获取这些chapter_id对应的book信息
const chapterIds = abandonWords.map(w => w.chapter_id).filter(id => id !== null)

const { data: chapters } = await supabase
  .from('chapters')
  .select('id, book_id, title')
  .in('id', chapterIds)

console.log('📚 这些abandon所属的章节和书籍:\n')
console.log('─'.repeat(120))

// 先获取所有书籍信息
const bookIds = chapters.map(c => c.book_id).filter(id => id !== null)
const { data: allBooks } = await supabase
  .from('books')
  .select('id, title')
  .in('id', bookIds)

const bookMap = {}
if (allBooks) {
  allBooks.forEach(book => {
    bookMap[book.id] = book.title
  })
}

abandonWords.forEach((word, index) => {
  const chapter = chapters.find(c => c.id === word.chapter_id)
  console.log(`${index + 1}. ${word.definition}`)
  console.log(`   Chapter: ${chapter?.title || 'unknown'}`)
  console.log(`   Book ID: ${chapter?.book_id || 'null'}`)
  if (chapter?.book_id && bookMap[chapter.book_id]) {
    console.log(`   Book: ${bookMap[chapter.book_id]}`)
  }
  console.log('─'.repeat(120))
})

// 统计：abandon在几本不同的书中
const uniqueBookIds = [...new Set(chapters.map(c => c.book_id).filter(id => id !== null))]

console.log(`\n📊 统计:`)
console.log(`   "abandon"总共出现: ${abandonWords.length} 次`)
console.log(`   分布在: ${uniqueBookIds.length} 本不同的书中`)
console.log(`   平均每本书: ${(abandonWords.length / uniqueBookIds.length).toFixed(1)} 个"abandon"释义`)

// 查看这些书的详细信息
if (uniqueBookIds.length > 0) {
  const { data: books } = await supabase
    .from('books')
    .select('id, title, description, category, total_words')
    .in('id', uniqueBookIds)

  console.log(`\n📖 包含"abandon"的所有书籍:\n`)
  books.forEach((book, index) => {
    console.log(`${index + 1}. ${book.title}`)
    console.log(`   分类: ${book.category}`)
    console.log(`   总词数: ${book.total_words}`)
    console.log(`   描述: ${book.description?.substring(0, 80)}...`)
    console.log('')
  })
}
