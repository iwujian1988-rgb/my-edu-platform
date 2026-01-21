import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://snnrjnpcmdsdlyldvvps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'
)

console.log('🔍 检查管理后台统计数据\n')

// 1. 测试RPC函数
console.log('1️⃣ 测试RPC函数 get_registration_trend:')
const { data: trendData, error: trendError } = await supabase.rpc('get_registration_trend', { days_count: 30 })

if (trendError) {
  console.error('❌ RPC调用失败:', trendError.message)
} else {
  console.log('✅ RPC调用成功')
  console.log(`   返回数据类型: ${typeof trendData}`)
  console.log(`   是否为数组: ${Array.isArray(trendData)}`)
  console.log(`   数据长度: ${trendData?.length || 0}`)

  if (trendData && trendData.length > 0) {
    console.log('   前3条数据:')
    trendData.slice(0, 3).forEach(d => {
      console.log(`     - ${JSON.stringify(d)}`)
    })

    // 检查非零数据
    const nonZero = trendData.filter(d => d.trend_count > 0)
    console.log(`   \n📊 有数据的天数: ${nonZero.length}`)
    if (nonZero.length > 0) {
      console.log('   有数据的日子:')
      nonZero.forEach(d => {
        console.log(`     - ${d.trend_date}: ${d.trend_count}人`)
      })
    }
  } else {
    console.log('   ⚠️ 返回数据为空')
  }
}

// 2. 手动查询统计数据
console.log('\n2️⃣ 手动查询统计数据:')

const todayStr = new Date().toISOString().split('T')[0]
const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)
const yesterdayStr = yesterday.toISOString().split('T')[0]

const [
  { count: totalUsers },
  { count: todayNewUsers },
  { count: yesterdayNewUsers }
] = await Promise.all([
  supabase.from('users').select('id', { count: 'exact', head: true }),
  supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStr),
  supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', yesterdayStr).lt('created_at', todayStr)
])

console.log(`   总用户数: ${totalUsers || 0}`)
console.log(`   今日新增: ${todayNewUsers || 0} (${todayStr})`)
console.log(`   昨日新增: ${yesterdayNewUsers || 0} (${yesterdayStr})`)

// 3. 检查所有用户的created_at
console.log('\n3️⃣ 所有用户的created_at分布:')
const { data: users } = await supabase
  .from('users')
  .select('id, created_at')
  .order('created_at', { ascending: false })

if (users) {
  console.log(`   总共 ${users.length} 个用户`)
  console.log('   按日期分组统计:')

  const byDate = {}
  users.forEach(user => {
    const date = user.created_at ? user.created_at.split('T')[0] : 'NULL'
    byDate[date] = (byDate[date] || 0) + 1
  })

  Object.entries(byDate)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 10)
    .forEach(([date, count]) => {
      console.log(`     - ${date}: ${count}人`)
    })
}

// 4. 模拟前端调用（使用service role）
console.log('\n4️⃣ 模拟前端RPC调用（带详细日志）:')
const { data: frontendData, error: frontendError } = await supabase.rpc('get_registration_trend', { days_count: 30 })

console.log('   完整返回数据:')
console.log(JSON.stringify(frontendData, null, 2))

if (frontendError) {
  console.error('   错误详情:', frontendError)
}
