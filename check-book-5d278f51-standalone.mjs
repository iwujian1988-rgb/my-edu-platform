import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env.local file manually
function loadEnv() {
  try {
    const envContent = readFileSync('.env.local', 'utf-8')
    const lines = envContent.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        let value = valueParts.join('=').trim()
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (key && value) {
          process.env[key] = value
        }
      }
    }
  } catch (error) {
    console.error('Failed to load .env.local:', error.message)
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Environment check:')
console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING')
console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Found (length: ' + supabaseKey.length + ')' : 'MISSING')
console.log('')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const bookId = '5d278f51-79d7-4f0d-b7b8-cc6d00632d82'

async function checkBook() {
  console.log('🔍 检查词书数据:', bookId)
  console.log('')

  // 1. 检查词书基本信息
  console.log('1️⃣ 检查词书基本信息...')
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
  console.log('')

  // 2. 检查该词书的单词数量
  console.log('2️⃣ 检查单词总数...')
  const { count, error: countError } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: false })
    .eq('book_id', bookId)

  if (countError) {
    console.log('❌ 单词计数失败:', countError)
  } else {
    console.log(`📊 单词总数: ${count}`)
  }
  console.log('')

  // 3. 检查前 10 个单词
  console.log('3️⃣ 检查前 10 个单词...')
  const { data: words, error: wordsError } = await supabase
    .from('words')
    .select('id, word, phonetic, definition, part_of_speech')
    .eq('book_id', bookId)
    .limit(10)

  if (wordsError) {
    console.log('❌ 单词查询失败:', wordsError)
  } else if (words && words.length > 0) {
    console.log(`📝 找到 ${words.length} 个单词:`)
    words.forEach((w, i) => {
      const def = w.definition ? w.definition.substring(0, 50) : '无定义'
      const phonetic = w.phonetic ? ` [${w.phonetic}]` : ''
      console.log(`   ${i + 1}. ${w.word}${phonetic} - ${def}${w.definition && w.definition.length > 50 ? '...' : ''}`)
    })
  } else {
    console.log('⚠️ 没有找到单词数据')
  }
  console.log('')

  // 4. 检查是否有章节信息
  console.log('4️⃣ 检查章节信息...')
  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, title, word_count, position')
    .eq('book_id', bookId)
    .order('position')
    .limit(5)

  if (chaptersError) {
    console.log('❌ 章节查询失败:', chaptersError)
  } else if (chapters && chapters.length > 0) {
    console.log(`📚 找到 ${chapters.length} 个章节:`)
    chapters.forEach((ch, i) => {
      console.log(`   ${i + 1}. ${ch.title} - ${ch.word_count} 个单词`)
    })
  } else {
    console.log('⚠️ 没有找到章节数据')
  }
  console.log('')

  // 总结
  console.log('📋 诊断总结:')
  console.log(`   - 词书存在: ${book ? '✅' : '❌'}`)
  console.log(`   - 单词数量: ${count || 0}`)
  console.log(`   - 章节数量: ${chapters?.length || 0}`)
  console.log(`   - 词书状态: ${book?.status || 'unknown'}`)

  if (count === 0) {
    console.log('')
    console.log('⚠️ 问题诊断: 该词书在数据库中没有单词数据')
    console.log('   可能原因:')
    console.log('   1. 数据未导入')
    console.log('   2. book_id 不匹配')
    console.log('   3. 单词被误删除')
  }
}

checkBook().catch(console.error)
