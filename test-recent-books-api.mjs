import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 读取 .env.local 文件
let supabaseUrl, supabaseKey
try {
  const envContent = readFileSync(join(__dirname, '.env.local'), 'utf-8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '')
    if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value
    if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = value
  })
} catch (error) {
  console.error('❌ 无法读取 .env.local 文件')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRecentBooksAPI() {
  console.log('\n🧪 测试 /api/recent-books API')
  console.log('=' .repeat(60))

  try {
    // 1. 模拟用户登录
    console.log('\n📱 步骤1: 查找用户...')
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', '15652936305')
      .single()

    if (userError || !users) {
      console.error('❌ 未找到用户')
      return
    }

    console.log('✅ 用户ID:', users.id)

    // 2. 测试 API 调用（模拟 GET /api/recent-books）
    console.log('\n📡 步骤2: 测试 API 端点...')

    // 直接查询数据库，模拟 API 的逻辑
    const { data: recentPrefs, error: prefsError } = await supabase
      .from('user_book_preferences')
      .select('book_id, last_accessed_at, last_resume_state, last_reading_progress')
      .eq('user_id', users.id)
      .not('last_accessed_at', 'is', null)
      .order('last_accessed_at', { ascending: false })
      .limit(6)

    if (prefsError) {
      console.error('❌ 查询失败:', prefsError)
      return
    }

    console.log('✅ 查询成功，找到', recentPrefs?.length || 0, '条记录')

    // 3. 获取书籍信息
    if (recentPrefs && recentPrefs.length > 0) {
      const bookIds = recentPrefs.map(p => p.book_id)
      const { data: booksData } = await supabase
        .from('books')
        .select('id, title, code')
        .in('id', bookIds)

      const booksMap = new Map((booksData || []).map(b => [b.id, b]))

      console.log('\n📊 最近访问的书籍（前3本）:')
      recentPrefs.slice(0, 3).forEach((pref, index) => {
        const book = booksMap.get(pref.book_id)
        const reading = pref.last_reading_progress

        console.log(`\n${index + 1}. ${book?.title || '未知'}`)
        console.log(`   访问时间: ${new Date(pref.last_accessed_at).toLocaleString('zh-CN')}`)
        console.log(`   阅读进度: 第${reading?.page || 1}页`)
        console.log(`   筛选条件: theme=${reading?.theme || 'all'}, status=${reading?.status || 'all'}`)
      })

      // 4. 检查最新的第2页记录
      const latestPage2 = recentPrefs.find(p => p.last_reading_progress?.page >= 2)
      if (latestPage2) {
        const book = booksMap.get(latestPage2.book_id)
        const reading = latestPage2.last_reading_progress
        console.log('\n✅ 找到最新的第2页访问记录:')
        console.log(`   书籍: ${book?.title || '未知'}`)
        console.log(`   页码: ${reading?.page}`)
        console.log(`   访问时间: ${new Date(latestPage2.last_accessed_at).toLocaleString('zh-CN')}`)
      } else {
        console.log('\n⚠️ 没有找到第2页或更后的访问记录')
      }
    }

    console.log('\n' + '=' .repeat(60))
    console.log('✅ 测试完成\n')

  } catch (error) {
    console.error('❌ 发生错误:', error)
  }
}

testRecentBooksAPI()
