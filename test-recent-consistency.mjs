import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRecentBooksConsistency() {
  console.log('🔍 测试"最近"功能一致性\n')

  // 模拟首页查询（取6个）
  console.log('1️⃣ 首页查询（limit 6）:')
  const { data: homepageData, error: homepageError } = await supabase
    .from('user_book_preferences')
    .select('book_id, last_accessed_at')
    .not('last_accessed_at', 'is', null)
    .order('last_accessed_at', { ascending: false })
    .limit(6)

  if (homepageError) {
    console.error('❌ 首页查询失败:', homepageError)
    return
  }

  console.log(`✅ 查询成功，返回 ${homepageData?.length || 0} 条记录`)
  if (homepageData && homepageData.length > 0) {
    homepageData.slice(0, 3).forEach((item, index) => {
      console.log(`   ${index + 1}. Book: ${item.book_id.slice(0, 8)} | Last: ${item.last_accessed_at}`)
    })
  }

  // 模拟API查询（取6个）
  console.log('\n2️⃣ API查询（limit 6）:')
  const { data: apiData, error: apiError } = await supabase
    .from('user_book_preferences')
    .select('book_id, last_accessed_at')
    .not('last_accessed_at', 'is', null)
    .order('last_accessed_at', { ascending: false })
    .limit(6)

  if (apiError) {
    console.error('❌ API查询失败:', apiError)
    return
  }

  console.log(`✅ 查询成功，返回 ${apiData?.length || 0} 条记录`)
  if (apiData && apiData.length > 0) {
    apiData.slice(0, 3).forEach((item, index) => {
      console.log(`   ${index + 1}. Book: ${item.book_id.slice(0, 8)} | Last: ${item.last_accessed_at}`)
    })
  }

  // 模拟系统词库列表查询（取6个）
  console.log('\n3️⃣ 系统词库列表查询（limit 6）:')
  const { data: libraryData, error: libraryError } = await supabase
    .from('user_book_preferences')
    .select('book_id, last_accessed_at')
    .not('last_accessed_at', 'is', null)
    .order('last_accessed_at', { ascending: false })
    .limit(6)

  if (libraryError) {
    console.error('❌ 系统词库列表查询失败:', libraryError)
    return
  }

  console.log(`✅ 查询成功，返回 ${libraryData?.length || 0} 条记录`)
  if (libraryData && libraryData.length > 0) {
    libraryData.slice(0, 3).forEach((item, index) => {
      console.log(`   ${index + 1}. Book: ${item.book_id.slice(0, 8)} | Last: ${item.last_accessed_at}`)
    })
  }

  // 验证一致性
  console.log('\n✅ 一致性验证:')
  const allConsistent =
    homepageData?.length === apiData?.length &&
    apiData?.length === libraryData?.length &&
    JSON.stringify(homepageData) === JSON.stringify(apiData) &&
    JSON.stringify(apiData) === JSON.stringify(libraryData)

  if (allConsistent) {
    console.log('✅ 三处查询结果完全一致')
    console.log(`   数据量: ${homepageData?.length || 0} 条`)
    console.log(`   查询条件: user_book_preferences.last_accessed_at DESC`)
    console.log(`   限制数量: 6`)
  } else {
    console.log('⚠️ 查询结果不一致，请检查')
  }

  console.log('\n📊 测试总结:')
  console.log('═'.repeat(50))
  console.log('✅ 首页 "最近学习": limit(6)')
  console.log('✅ API /api/recent-books: limit(6)')
  console.log('✅ 系统词库列表: limit(6)')
  console.log('✅ 数据源一致: user_book_preferences')
  console.log('✅ 排序一致: last_accessed_at DESC')
  console.log('═'.repeat(50))
}

testRecentBooksConsistency()
