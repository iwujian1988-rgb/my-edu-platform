import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const bookId = '5d278f51-79d7-4f0d-b7b8-cc6d00632d82'

async function checkBook() {
  console.log('🔍 检查词书数据:', bookId)

  // 1. 检查词书基本信息
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single()

  if (bookError) {
    console.log('❌ 词书查询失败:', bookError)
    return
  }

  console.log('✅ 词书信息:', {
    id: book.id,
    title: book.title,
    total_words: book.total_words,
    status: book.status
  })

  // 2. 检查该词书的单词数量
  const { count, error: countError } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: false })
    .eq('book_id', bookId)

  if (countError) {
    console.log('❌ 单词计数失败:', countError)
  } else {
    console.log(`📊 单词总数: ${count}`)
  }

  // 3. 检查前 10 个单词
  const { data: words, error: wordsError } = await supabase
    .from('words')
    .select('id, word, phonetic, definition, part_of_speech')
    .eq('book_id', bookId)
    .limit(10)

  if (wordsError) {
    console.log('❌ 单词查询失败:', wordsError)
  } else {
    console.log(`📝 前 10 个单词:`)
    words.forEach((w, i) => {
      console.log(`   ${i + 1}. ${w.word} - ${w.definition?.substring(0, 50) || '无定义'}`)
    })
  }
}

checkBook().catch(console.error)
