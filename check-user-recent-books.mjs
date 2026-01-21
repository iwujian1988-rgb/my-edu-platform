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
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '') // 移除引号
    if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value
    if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = value
  })
} catch (error) {
  console.error('❌ 无法读取 .env.local 文件')
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUserRecentBooks() {
  const phone = '15652936305'

  console.log(`\n🔍 查询手机号: ${phone}`)
  console.log('=' .repeat(60))

  try {
    // 1. 根据手机号查找用户
    console.log('\n📱 步骤1: 查找用户...')
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, phone_number, email')
      .eq('phone_number', phone)

    if (userError) {
      console.error('❌ 查询用户失败:', userError)
      return
    }

    if (!users || users.length === 0) {
      console.log('❌ 未找到该手机号的用户')
      return
    }

    const user = users[0]
    console.log('✅ 找到用户:')
    console.log(`   - ID: ${user.id}`)
    console.log(`   - 手机号: ${user.phone_number}`)
    console.log(`   - 邮箱: ${user.email}`)

    // 2. 查询最近访问的书籍
    console.log('\n📚 步骤2: 查询最近访问的书籍...')
    const { data: prefs, error: prefsError } = await supabase
      .from('user_book_preferences')
      .select('*')
      .eq('user_id', user.id)
      .not('last_accessed_at', 'is', null)
      .order('last_accessed_at', { ascending: false })

    if (prefsError) {
      console.error('❌ 查询失败:', prefsError)
      return
    }

    if (!prefs || prefs.length === 0) {
      console.log('❌ 没有找到访问记录')
      return
    }

    console.log(`✅ 找到 ${prefs.length} 条访问记录:\n`)

    // 3. 获取书籍详细信息
    const bookIds = prefs.map(p => p.book_id)
    const { data: books } = await supabase
      .from('books')
      .select('id, title, code, total_words')
      .in('id', bookIds)

    const booksMap = new Map((books || []).map(b => [b.id, b]))

    // 4. 打印每条记录
    prefs.forEach((pref, index) => {
      const book = booksMap.get(pref.book_id)

      console.log(`📖 记录 ${index + 1}`)
      console.log(`   书籍ID: ${pref.book_id}`)
      console.log(`   书名: ${book?.title || '未知'}`)
      console.log(`   代码: ${book?.code || 'N/A'}`)
      console.log(`   总词数: ${book?.total_words || 0}`)

      // 最后访问时间
      const accessedAt = pref.last_accessed_at
      const timeAgo = accessedAt
        ? new Date(accessedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : '未知'
      console.log(`   最后访问: ${timeAgo}`)

      // 阅读进度（单词列表模式）
      if (pref.last_reading_progress) {
        const reading = pref.last_reading_progress
        console.log(`   📖 阅读进度:`)
        console.log(`      - 页码: ${reading.page || 1}`)
        console.log(`      - 主题: ${reading.theme || 'all'}`)
        console.log(`      - 场景: ${reading.scenario || 'all'}`)
        console.log(`      - 章节: ${reading.chapter || 'all'}`)
        console.log(`      - 状态: ${reading.status || 'all'}`)
      } else {
        console.log(`   📖 阅读进度: 无`)
      }

      // 断点续做状态（练习模式）
      if (pref.last_resume_state) {
        const resume = pref.last_resume_state
        console.log(`   🎯 断点续做:`)
        console.log(`      - 模式: ${resume.mode || 'N/A'}`)
        console.log(`      - 范围: ${resume.context?.scope || 'all'}`)
        console.log(`      - 索引: ${resume.context?.index || 0}`)
      } else {
        console.log(`   🎯 断点续做: 无`)
      }

      console.log('')
    })

    console.log('=' .repeat(60))
    console.log('✅ 查询完成\n')

  } catch (error) {
    console.error('❌ 发生错误:', error)
  }
}

checkUserRecentBooks()
