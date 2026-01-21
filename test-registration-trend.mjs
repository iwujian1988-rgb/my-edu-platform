import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://snnrjnpcmdsdlyldvvps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'
)

console.log('🔍 测试RPC函数 get_registration_trend\n')

// 1. 测试RPC函数
const { data: trendData, error: trendError } = await supabase.rpc('get_registration_trend', { days_count: 30 })

if (trendError) {
  console.error('❌ RPC调用失败:', trendError.message)
  console.error('   错误详情:', JSON.stringify(trendError, null, 2))
  process.exit(1)
}

console.log('✅ RPC调用成功!')
console.log('📊 返回数据:')
console.log(JSON.stringify(trendData, null, 2))

// 2. 检查数据格式
if (trendData && trendData.length > 0) {
  console.log('\n✅ 数据格式正确')
  console.log(`   总共 ${trendData.length} 天数据`)
  console.log(`   第一条:`, trendData[0])
  console.log(`   最后一条:`, trendData[trendData.length - 1])

  // 3. 检查是否有非零数据
  const nonZeroDays = trendData.filter(d => d.user_count > 0)
  console.log(`\n📈 有注册用户的天数: ${nonZeroDays.length}`)
  if (nonZeroDays.length > 0) {
    console.log('   有数据的日子:')
    nonZeroDays.forEach(d => {
      console.log(`     - ${d.reg_date}: ${d.user_count}人`)
    })
  } else {
    console.log('   ⚠️  所有天都是0人，可能历史用户的created_at不在最近30天内')
  }
} else {
  console.log('\n⚠️  返回数据为空')
}

// 4. 检查所有用户的created_at分布
console.log('\n🔍 检查所有用户的created_at分布:')
const { data: users, error: usersError } = await supabase
  .from('users')
  .select('id, created_at')
  .order('created_at', { ascending: false })
  .limit(20)

if (usersError) {
  console.error('❌ 查询用户失败:', usersError.message)
} else {
  console.log(`   最近20个用户的created_at:`)
  users.forEach((user, index) => {
    const date = user.created_at ? user.created_at.split('T')[0] : 'NULL'
    const id = user.id ? user.id.slice(0, 8) : 'N/A'
    console.log(`     ${index + 1}. ${id}... - ${date}`)
  })
}

// 5. 手动查询最近30天每天的注册数
console.log('\n📊 手动查询最近30天注册数:')
for (let i = 29; i >= 0; i--) {
  const date = new Date()
  date.setDate(date.getDate() - i)
  const dateStr = date.toISOString().split('T')[0]

  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', dateStr)
    .lt('created_at', dateStr + 'T23:59:59')

  if (count > 0) {
    console.log(`  - ${dateStr}: ${count} 人`)
  }
}
