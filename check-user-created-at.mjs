import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://snnrjnpcmdsdlyldvvps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'
)

console.log('检查 users 表结构和 created_at 数据...\n')

// 1. 检查表结构（通过查询几条数据看字段）
const { data: sampleUsers, error: sampleError } = await supabase
  .from('users')
  .select('id, phone, created_at')
  .limit(5)

if (sampleError) {
  console.error('❌ 查询失败:', sampleError.message)
} else {
  console.log('✅ 前5条用户数据:')
  sampleUsers.forEach(user => {
    const id = user.id ? user.id.slice(0, 8) + '...' : 'N/A'
    const phone = user.phone || 'N/A'
    const created = user.created_at || 'NULL'
    console.log(`  - ID: ${id}, Phone: ${phone}, Created: ${created}`)
  })
}

// 2. 统计 created_at 为空的用户
const { data: usersWithoutDate, error: nullError } = await supabase
  .from('users')
  .select('id', { count: 'exact', head: true })
  .is('created_at', null)

console.log('\n📊 统计:')
const nullCount = usersWithoutDate?.count || 0
console.log('  - created_at 为空的用户数:', nullCount)

// 3. 统计有 created_at 的用户
const { count: usersWithDate } = await supabase
  .from('users')
  .select('id', { count: 'exact', head: true })
  .not('created_at', 'is', null)

console.log('  - created_at 有值的用户数:', usersWithDate || 0)

// 4. 测试 RPC 函数
console.log('\n🔄 测试 RPC 函数 get_registration_trend...')
const { data: trendData, error: trendError } = await supabase.rpc('get_registration_trend', { days_count: 7 })

if (trendError) {
  console.error('❌ RPC 调用失败:', trendError.message)
  console.error('   详情:', trendError)
} else {
  console.log('✅ RPC 调用成功，返回数据:')
  console.log(JSON.stringify(trendData, null, 2))
}

// 5. 手动查询最近7天的注册数（验证数据）
console.log('\n🔍 手动查询最近7天注册数:')
for (let i = 6; i >= 0; i--) {
  const date = new Date()
  date.setDate(date.getDate() - i)
  const dateStr = date.toISOString().split('T')[0]

  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', dateStr)
    .lt('created_at', dateStr + 'T23:59:59')

  console.log(`  - ${dateStr}: ${count || 0} 人`)
}
