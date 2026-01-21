/**
 * 调试脚本：测试 /api/words 接口
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少环境变量')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '已设置' : '未设置')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '已设置' : '未设置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testWordsAPI() {
  console.log('🔍 测试单词数据查询...\n')

  // 1. 先获取所有书籍
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(5)

  if (booksError) {
    console.error('❌ 获取书籍失败:', booksError)
    return
  }

  console.log(`📚 找到 ${books.length} 本书:`)
  books.forEach(book => {
    console.log(`  - ${book.id}: ${book.title}`)
  })

  if (books.length === 0) {
    console.log('\n⚠️  没有任何书籍数据')
    return
  }

  // 测试第一本书
  const testBookId = books[0].id
  console.log(`\n📖 测试书籍: ${books[0].title} (${testBookId})`)

  // 2. 查询这本书的单词数量
  const { count: totalWords, error: countError } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', testBookId)

  if (countError) {
    console.error('❌ 查询单词数量失败:', countError)
    return
  }

  console.log(`\n📊 单词总数: ${totalWords || 0}`)

  if (totalWords === 0) {
    console.log('\n⚠️  这本书没有单词数据！')
    console.log('💡 需要导入单词数据')

    // 检查其他书籍是否有单词
    console.log('\n🔍 检查其他书籍的单词数量...')
    for (const book of books) {
      const { count } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', book.id)

      console.log(`  - ${book.title}: ${count || 0} 个单词`)
    }

    return
  }

  // 3. 获取前5个单词作为示例
  const { data: sampleWords, error: sampleError } = await supabase
    .from('words')
    .select('id, word, book_id')
    .eq('book_id', testBookId)
    .limit(5)

  if (sampleError) {
    console.error('❌ 获取示例单词失败:', sampleError)
    return
  }

  console.log('\n📝 示例单词:')
  sampleWords.forEach(word => {
    console.log(`  - ${word.word} (id: ${word.id})`)
  })

  // 4. 测试不同的status参数
  console.log('\n🧪 测试不同status参数的筛选结果:')

  const statuses = ['all', 'unknown', 'fuzzy', 'known', 'new']
  for (const status of statuses) {
    const { count } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', testBookId)

    console.log(`  - ${status}: ${count || 0} 个单词`)
  }
}

testWordsAPI()
  .then(() => {
    console.log('\n✅ 测试完成')
  })
  .catch(error => {
    console.error('\n❌ 测试失败:', error)
    process.exit(1)
  })
