import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCalendarData() {
  try {
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ 未登录')
      return
    }

    console.log('📅 当前用户:', user.id)
    console.log('📅 今天:', new Date().toISOString())

    // 查询 word_progress 数据
    const { data: wordsData, error } = await supabase
      .from('word_progress')
      .select('created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(20)

    if (error) {
      console.log('❌ 查询失败:', error)
      return
    }

    console.log(`\n📊 最近20条 word_progress 记录:`)
    console.log('总数:', wordsData?.length || 0)

    wordsData?.forEach((word, index) => {
      const createdDate = new Date(word.created_at)
      const updatedDate = new Date(word.updated_at)
      console.log(`${index + 1}. 创建: ${createdDate.toISOString()} | 更新: ${updatedDate.toISOString()}`)
    })

    // 统计每月的数据
    const monthCounts = {}
    wordsData?.forEach((word) => {
      const date = new Date(word.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1
    })

    console.log('\n📊 按月统计:')
    Object.entries(monthCounts).forEach(([month, count]) => {
      console.log(`${month}: ${count} 个`)
    })

  } catch (error) {
    console.error('❌ 错误:', error)
  }
}

checkCalendarData()
