import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'

dotenv.config({ path: '.env.production' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function listBooks() {
  const { data, error } = await supabase
    .from('books')
    .select('id, title, abbreviation, description, total_words, is_official, cover_url, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log('\n=== 词书列表 ===')
  console.log(`总数: ${data.length} 本`)
  console.log('\n序号 | ID | 标题 | 缩写 | 单词数 | 官方 | 封面')
  console.log('-'.repeat(150))

  data.forEach((book, index) => {
    const id = book.id.substring(0, 8)
    const title = book.title.padEnd(30, ' ')
    const abbr = (book.abbreviation || '-').padEnd(10, ' ')
    const words = String(book.total_words || 0).padStart(6, ' ')
    const official = book.is_official ? '✓' : '✗'
    const cover = book.cover_url ? '有' : '无'

    console.log(`${String(index + 1).padStart(3, ' ')} | ${id}... | ${title} | ${abbr} | ${words} | ${official} | ${cover}`)
  })

  console.log('\n=== 详细信息 ===')
  data.forEach((book, index) => {
    console.log(`\n${index + 1}. ${book.title}`)
    console.log(`   ID: ${book.id}`)
    console.log(`   缩写: ${book.abbreviation || '无'}`)
    console.log(`   描述: ${book.description || '无'}`)
    console.log(`   单词数: ${book.total_words || 0}`)
    console.log(`   官方: ${book.is_official ? '是' : '否'}`)
    console.log(`   封面: ${book.cover_url || '无'}`)
  })
}

listBooks()
