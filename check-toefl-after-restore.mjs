import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function loadEnv() {
  try {
    const envContent = readFileSync('.env.local', 'utf-8')
    const lines = envContent.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        let value = valueParts.join('=').trim()
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyTOEFL() {
  const bookId = '5d278f51-79d7-4f0d-b7b8-cc6d00632d82'

  console.log('🔍 验证 TOEFL 词书数据恢复\n')

  // 1. 词书信息
  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single()

  console.log('📚 词书信息:')
  console.log(`   标题: ${book.title}`)
  console.log(`   预期单词数: ${book.total_words}`)
  console.log('')

  // 2. 实际单词数
  const { count } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', bookId)

  console.log(`📊 实际单词数: ${count}`)
  console.log('')

  // 3. 单词样例
  const { data: words } = await supabase
    .from('words')
    .select('id, word, phonetic, definition, part_of_speech')
    .eq('book_id', bookId)
    .order('order_index')
    .limit(10)

  console.log('📝 前 10 个单词:')
  words.forEach((w, i) => {
    const def = w.definition ? w.definition.substring(0, 60) : '无定义'
    const phonetic = w.phonetic ? ` [${w.phonetic}]` : ''
    console.log(`   ${i + 1}. ${w.word}${phonetic} - ${def}${w.definition && w.definition.length > 60 ? '...' : ''}`)
  })
  console.log('')

  // 4. 章节信息
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title, word_count')
    .eq('book_id', bookId)
    .order('order_index')
    .limit(5)

  console.log('📖 前 5 个章节:')
  chapters.forEach((ch, i) => {
    console.log(`   ${i + 1}. ${ch.title} - ${ch.word_count} 个单词`)
  })
  console.log('')

  // 总结
  const match = count === book.total_words

  console.log('📋 验证结果:')
  console.log(`   ${match ? '✅' : '❌'} 单词数匹配: ${count}/${book.total_words}`)
  console.log(`   ${words.length > 0 ? '✅' : '❌'} 单词数据可访问`)
  console.log(`   ${chapters.length > 0 ? '✅' : '❌'} 章节数据可访问`)

  if (match && words.length > 0) {
    console.log('')
    console.log('🎉 TOEFL 词书数据完全恢复！')
    console.log(`   页面地址: http://localhost:3000/library/${bookId}`)
  }
}

verifyTOEFL().catch(console.error)
