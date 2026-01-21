import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 读取 .env.local 文件
const envPath = resolve('.env.local')
const envContent = readFileSync(envPath, 'utf-8')

// 解析环境变量
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    const [, key, value] = match
    // 去掉引号
    envVars[key] = value.replace(/^["']|["']$/g, '')
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 环境变量')
  console.error('.env.local 内容:', envContent)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('📚 正在查询数据库中的所有单词书...\n')

// 查询所有单词书
const { data: books, error } = await supabase
  .from('books')
  .select('*')
  .order('created_at', { ascending: true })

if (error) {
  console.error('❌ 查询失败:', error)
  process.exit(1)
}

console.log(`✅ 找到 ${books.length} 本单词书:\n`)
console.log('='.repeat(100))

books.forEach((book, index) => {
  console.log(`\n📖 ${index + 1}. ${book.title}`)
  console.log('─'.repeat(100))
  console.log(`ID:              ${book.id}`)
  console.log(`描述:            ${book.description || '无'}`)
  console.log(`分类:            ${book.category}`)
  console.log(`是否官方:        ${book.is_official ? '✅' : '❌'}`)
  console.log(`是否发布:        ${book.is_published ? '✅' : '❌'}`)
  console.log(`总单词数:        ${book.total_words}`)
  console.log(`总章节数:        ${book.total_chapters}`)
  console.log(`封面URL:         ${book.cover_url || '无'}`)
  console.log(`创建者:          ${book.created_by || '无'}`)
  console.log(`创建时间:        ${book.created_at}`)
  console.log(`审核状态:        ${book.review_status || '无'}`)

  if (book.review_reason) {
    console.log(`审核原因:        ${book.review_reason}`)
  }
  if (book.reviewed_by) {
    console.log(`审核人:          ${book.reviewed_by}`)
    console.log(`审核时间:        ${book.reviewed_at}`)
  }
})

console.log('\n' + '='.repeat(100))

// 统计信息
const stats = {
  total: books.length,
  official: books.filter(b => b.is_official).length,
  published: books.filter(b => b.is_published).length,
  byCategory: {},
  totalWords: 0,
  totalChapters: 0
}

books.forEach(book => {
  stats.byCategory[book.category] = (stats.byCategory[book.category] || 0) + 1
  stats.totalWords += book.total_words || 0
  stats.totalChapters += book.total_chapters || 0
})

console.log('\n📊 统计信息:')
console.log('─'.repeat(100))
console.log(`总单词书数:      ${stats.total}`)
console.log(`官方词库:        ${stats.official}`)
console.log(`已发布:          ${stats.published}`)
console.log(`总单词数:        ${stats.totalWords.toLocaleString()}`)
console.log(`总章节数:        ${stats.totalChapters.toLocaleString()}`)
console.log('\n按分类统计:')
Object.entries(stats.byCategory).forEach(([category, count]) => {
  console.log(`  ${category}:    ${count} 本`)
})

console.log('\n' + '='.repeat(100))
