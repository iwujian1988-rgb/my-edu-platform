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

async function checkBooksData() {
  const phone = '15652936305'

  console.log(`\n🔍 检查用户 ${phone} 的最近访问数据`)
  console.log('=' .repeat(80))

  try {
    // 1. 查找用户
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', phone)
      .single()

    if (userError || !users) {
      console.error('❌ 未找到用户')
      return
    }

    console.log('✅ 用户ID:', users.id)

    // 2. 查询最近访问记录
    const { data: prefs, error: prefsError } = await supabase
      .from('user_book_preferences')
      .select('*')
      .eq('user_id', users.id)
      .not('last_accessed_at', 'is', null)
      .order('last_accessed_at', { ascending: false })
      .limit(10)

    if (prefsError) {
      console.error('❌ 查询失败:', prefsError)
      return
    }

    console.log(`\n📚 找到 ${prefs.length} 条访问记录\n`)

    // 3. 获取书籍信息
    const bookIds = prefs.map(p => p.book_id)
    const { data: booksData } = await supabase
      .from('books')
      .select('id, title, code, is_official, created_by, total_words')
      .in('id', bookIds)

    const booksMap = new Map((booksData || []).map(b => [b.id, b]))

    // 4. 打印详细数据
    prefs.forEach((pref, index) => {
      const book = booksMap.get(pref.book_id)
      const reading = pref.last_reading_progress

      console.log(`📖 记录 ${index + 1}`)
      console.log(`   书籍ID: ${pref.book_id}`)
      console.log(`   书名: ${book?.title || '❌ 未找到'}`)
      console.log(`   代码: ${book?.code || 'N/A'}`)
      console.log(`   总词数: ${book?.total_words || 0}`)
      console.log(`   是否官方: ${book?.is_official ? '是' : '否'}`)
      console.log(`   创建者: ${book?.created_by || 'N/A'}`)
      console.log(`   最后访问: ${new Date(pref.last_accessed_at).toLocaleString('zh-CN')}`)

      if (reading) {
        console.log(`   📖 阅读进度: 第${reading.page}页 (theme=${reading.theme}, status=${reading.status})`)
      } else {
        console.log(`   📖 阅读进度: 无`)
      }

      // 检查是否是垃圾数据
      const issues = []
      if (!book) issues.push('书籍不存在')
      if (book && !book.title) issues.push('书名为空')
      if (book && book.total_words === 0) issues.push('总词数为0')
      if (book && !book.is_official && !book.created_by) issues.push('非官方书但无创建者')

      if (issues.length > 0) {
        console.log(`   ⚠️ 问题: ${issues.join(', ')}`)
      }

      console.log('')
    })

    // 5. 统计垃圾数据
    const garbageBooks = prefs.filter(pref => {
      const book = booksMap.get(pref.book_id)
      return !book || (book && (!book.title || book.total_words === 0))
    })

    if (garbageBooks.length > 0) {
      console.log('⚠️ 垃圾数据统计:')
      console.log(`   - 总数: ${garbageBooks.length} 条`)
      console.log(`   - 占比: ${Math.round(garbageBooks.length / prefs.length * 100)}%`)
      console.log(`\n垃圾书籍ID:`)
      garbageBooks.forEach(pref => {
        console.log(`   - ${pref.book_id}`)
      })
    }

    console.log('=' .repeat(80))
    console.log('✅ 检查完成\n')

  } catch (error) {
    console.error('❌ 发生错误:', error)
  }
}

checkBooksData()
