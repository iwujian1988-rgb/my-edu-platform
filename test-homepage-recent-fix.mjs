import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local manually
function loadEnvFile() {
  const envPath = join(__dirname, '.env.local')
  try {
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^"|"$/g, '')
        process.env[key] = value
      }
    })
  } catch (error) {
    console.warn('Warning: Could not load .env.local:', error.message)
  }
}

loadEnvFile()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   URL:', supabaseUrl ? 'OK' : 'MISSING')
  console.error('   KEY:', supabaseKey ? 'OK' : 'MISSING')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testHomepageRecentBooks() {
  console.log('🔍 测试首页"最近学习"数据获取逻辑\n')
  console.log('='.repeat(60))

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
  console.log('✅ 测试用户ID:', userId)
  console.log('')

  // 🔧 模拟首页的5个并行查询
  console.log('📊 执行5个并行查询...\n')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    recentPrefsResult,
    mistakesResult,
    todayWordsResult,
    recentProgressResult,
    typingRecentResult
  ] = await Promise.all([
    // 查询1：user_book_preferences
    supabase
      .from('user_book_preferences')
      .select('book_id, last_accessed_at')
      .eq('user_id', userId)
      .not('last_accessed_at', 'is', null)
      .order('last_accessed_at', { ascending: false })
      .limit(3),

    // 查询2：错题数量
    supabase
      .from('word_progress')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['unknown', 'fuzzy']),

    // 查询3：今日新增生词
    supabase
      .from('word_progress')
      .select('id')
      .eq('user_id', userId)
      .gte('updated_at', today.toISOString())
      .eq('status', 'new'),

    // 查询4：word_progress 备用
    supabase
      .from('word_progress')
      .select('book_id, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10),

    // 查询5：typing_recent_practice RPC
    supabase.rpc('get_typing_recent_practice', { p_user_id: userId })
  ])

  const recentPrefs = recentPrefsResult.data
  const recentProgress = recentProgressResult.data
  const typingRecent = typingRecentResult.data

  console.log('=== 📋 查询结果统计 ===')
  console.log('1. user_book_preferences:', recentPrefs?.length || 0, '条')
  console.log('2. mistakes:', mistakesResult.data?.length || 0, '条')
  console.log('3. today new words:', todayWordsResult.data?.length || 0, '条')
  console.log('4. word_progress:', recentProgress?.length || 0, '条')
  console.log('5. typing_recent_practice (RPC):', typingRecent?.length || 0, '条')
  console.log('')

  // 🔍 3层优先级逻辑测试
  console.log('=== 🎯 3层优先级逻辑测试 ===')
  let recentBookIds = []
  let dataSource = ''

  if (recentPrefs && recentPrefs.length > 0) {
    recentBookIds = recentPrefs.map(pref => pref.book_id)
    dataSource = 'user_book_preferences'
    console.log('✅ 使用第1优先级: user_book_preferences')
    console.log('   提取词库ID:', recentBookIds)
  } else if (typingRecent && typingRecent.length > 0) {
    const uniqueBooks = new Map()
    for (const row of typingRecent) {
      if (!uniqueBooks.has(row.book_id)) {
        uniqueBooks.set(row.book_id, row.last_practice_at || row.created_at)
        if (uniqueBooks.size >= 3) break
      }
    }
    recentBookIds = Array.from(uniqueBooks.keys())
    dataSource = 'typing_recent_practice'
    console.log('✅ 使用第2优先级: typing_recent_practice')
    console.log('   提取词库ID:', recentBookIds)
  } else if (recentProgress && recentProgress.length > 0) {
    const uniqueBooks = new Map()
    for (const row of recentProgress) {
      if (!uniqueBooks.has(row.book_id)) {
        uniqueBooks.set(row.book_id, row.updated_at)
        if (uniqueBooks.size >= 3) break
      }
    }
    recentBookIds = Array.from(uniqueBooks.keys())
    dataSource = 'word_progress'
    console.log('✅ 使用第3优先级: word_progress')
    console.log('   提取词库ID:', recentBookIds)
  } else {
    console.log('❌ 所有数据源都为空！')
  }

  console.log('')
  console.log('=== 📖 查询书籍详情 ===')

  if (recentBookIds.length > 0) {
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, title, description, total_words')
      .in('id', recentBookIds)

    console.log('查询结果:', books?.length || 0, '本书籍')
    console.log('错误:', booksError?.message || '无')

    if (books && books.length > 0) {
      console.log('')
      console.log('=== ✅ 最终结果：最近学习的书籍 ===')
      books.forEach((book, i) => {
        console.log(`${i + 1}. ${book.title}`)
        console.log(`   ID: ${book.id}`)
        console.log(`   描述: ${book.description || '无'}`)
        console.log(`   单词数: ${book.total_words || 0}`)
        console.log('')
      })
    } else {
      console.log('❌ 未找到匹配的书籍详情')
    }
  } else {
    console.log('❌ 没有可显示的书籍（空空如也）')
  }

  console.log('='.repeat(60))
  console.log('✅ 测试完成')
  console.log('')
  console.log('📊 数据来源:', dataSource || '无')
  console.log('📚 最终书籍数量:', recentBookIds.length > 0 ? '有数据' : '空空如也')
}

testHomepageRecentBooks().catch(console.error)
