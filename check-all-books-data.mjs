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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAllBooks() {
  console.log('🔍 检查所有词书的数据完整性...\n')

  // 1. 获取所有词书
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('id, title, total_words')
    .order('title')

  if (booksError) {
    console.log('❌ 获取词书列表失败:', booksError)
    return
  }

  console.log(`📚 找到 ${books.length} 本词书\n`)

  // 2. 检查每本书的实际单词数量
  const results = []
  for (const book of books) {
    const { count } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', book.id)

    const hasData = count > 0
    const dataMatch = count === book.total_words

    results.push({
      title: book.title,
      id: book.id,
      expected: book.total_words,
      actual: count,
      hasData,
      dataMatch
    })
  }

  // 3. 分类统计
  const withData = results.filter(r => r.hasData)
  const withoutData = results.filter(r => !r.hasData)
  const mismatch = results.filter(r => r.hasData && !r.dataMatch)

  console.log('📊 数据统计:')
  console.log(`   - 有单词数据: ${withData.length} 本`)
  console.log(`   - 无单词数据: ${withoutData.length} 本`)
  console.log(`   - 数据不匹配: ${mismatch.length} 本`)
  console.log('')

  // 4. 显示没有数据的书
  if (withoutData.length > 0) {
    console.log('⚠️ 没有单词数据的词书:')
    withoutData.forEach(r => {
      console.log(`   ❌ ${r.title} (预期: ${r.expected}, 实际: ${r.actual})`)
    })
    console.log('')
  }

  // 5. 显示数据不匹配的书
  if (mismatch.length > 0) {
    console.log('⚠️ 数据不匹配的词书:')
    mismatch.forEach(r => {
      const diff = r.expected - r.actual
      console.log(`   ⚠️  ${r.title} (预期: ${r.expected}, 实际: ${r.actual}, 差值: ${diff})`)
    })
    console.log('')
  }

  // 6. 显示有数据的书
  if (withData.length > 0) {
    console.log('✅ 有单词数据的词书:')
    withData.forEach(r => {
      const status = r.dataMatch ? '✅' : '⚠️'
      console.log(`   ${status} ${r.title} (${r.actual} 个单词)`)
    })
  }

  // 7. 总结
  console.log('\n📋 诊断总结:')
  console.log(`   总词书数: ${books.length}`)
  console.log(`   无数据: ${withoutData.length} (${(withoutData.length/books.length*100).toFixed(1)}%)`)
  console.log(`   有数据: ${withData.length} (${(withData.length/books.length*100).toFixed(1)}%)`)

  if (withoutData.length > 0) {
    console.log('\n⚠️ 严重问题: 多本词书没有单词数据!')
    console.log('   可能原因:')
    console.log('   1. 单词数据被误删除')
    console.log('   2. 数据导入未完成')
    console.log('   3. book_id 外键关系丢失')
  }
}

checkAllBooks().catch(console.error)
