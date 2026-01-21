import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRecentBooks() {
  console.log('🔍 测试最近学习数据获取...\n')

  // 获取第一个用户（用于测试）
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id')
    .limit(1)

  if (userError || !users || users.length === 0) {
    console.error('❌ 无法获取用户:', userError)
    return
  }

  const userId = users[0].id
  console.log(`✅ 使用测试用户ID: ${userId}\n`)

  // 测试1: user_book_preferences
  console.log('📋 测试1: user_book_preferences')
  const { data: recentPrefs, error: prefsError } = await supabase
    .from('user_book_preferences')
    .select('book_id, last_accessed_at')
    .eq('user_id', userId)
    .not('last_accessed_at', 'is', null)
    .order('last_accessed_at', { ascending: false })
    .limit(3)

  console.log('  数据:', recentPrefs ? recentPrefs.length : 0, '条')
  console.log('  错误:', prefsError?.message || '无')
  if (recentPrefs && recentPrefs.length > 0) {
    console.log('  示例:', recentPrefs[0])
  }
  console.log('')

  // 测试2: word_progress
  console.log('📚 测试2: word_progress (最近学习的词库)')
  const { data: recentProgress, error: progressError } = await supabase
    .from('word_progress')
    .select('book_id, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(10)

  console.log('  数据:', recentProgress ? recentProgress.length : 0, '条')
  console.log('  错误:', progressError?.message || '无')
  if (recentProgress && recentProgress.length > 0) {
    console.log('  示例:', recentProgress[0])

    // 提取唯一的词库ID
    const uniqueBooks = new Map()
    for (const row of recentProgress) {
      if (!uniqueBooks.has(row.book_id)) {
        uniqueBooks.set(row.book_id, row.updated_at)
        if (uniqueBooks.size >= 3) break
      }
    }
    const recentBookIds = Array.from(uniqueBooks.keys())
    console.log('  提取的词库ID:', recentBookIds)
  }
  console.log('')

  // 测试3: 获取书籍信息
  if (recentPrefs && recentPrefs.length > 0) {
    const bookIds = recentPrefs.map(p => p.book_id)
    console.log('📖 测试3: 获取书籍信息 (from user_book_preferences)')
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, title')
      .in('id', bookIds)

    console.log('  数据:', books ? books.length : 0, '条')
    console.log('  错误:', booksError?.message || '无')
    if (books && books.length > 0) {
      console.log('  书籍列表:')
      books.forEach(book => {
        console.log(`    - ${book.title} (${book.id})`)
      })
    }
  } else if (recentProgress && recentProgress.length > 0) {
    const uniqueBooks = new Map()
    for (const row of recentProgress) {
      if (!uniqueBooks.has(row.book_id)) {
        uniqueBooks.set(row.book_id, row.updated_at)
        if (uniqueBooks.size >= 3) break
      }
    }
    const bookIds = Array.from(uniqueBooks.keys())
    console.log('📖 测试3: 获取书籍信息 (from word_progress)')
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, title')
      .in('id', bookIds)

    console.log('  数据:', books ? books.length : 0, '条')
    console.log('  错误:', booksError?.message || '无')
    if (books && books.length > 0) {
      console.log('  书籍列表:')
      books.forEach(book => {
        console.log(`    - ${book.title} (${book.id})`)
      })
    }
  }

  console.log('\n✅ 测试完成')
}

testRecentBooks().catch(console.error)
