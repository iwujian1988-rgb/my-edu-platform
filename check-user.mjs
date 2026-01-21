import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkUser(phone) {
  console.log(`\n🔍 检查手机号: ${phone}\n`)

  // 1. 检查 public.users 表
  const { data: publicUser, error: publicError } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', phone)
    .single()

  console.log('📋 public.users 表:')
  if (publicUser) {
    console.log('  ✅ 用户已存在')
    console.log('  - ID:', publicUser.id)
    console.log('  - Email:', publicUser.email)
    console.log('  - Phone:', publicUser.phone_number)
    console.log('  - 创建时间:', publicUser.created_at)
  } else {
    console.log('  ❌ 用户不存在')
    console.log('  - 错误:', publicError?.message)
  }

  // 2. 检查 auth.users (通过 email)
  const email = `${phone}@phone.xiaoyu.com`
  console.log('\n🔐 auth.users (邮箱):', email)

  // 使用 admin API 列出用户
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (!listError && users) {
    const authUser = users.find(u => u.email === email)
    if (authUser) {
      console.log('  ✅ Auth 用户已存在')
      console.log('  - ID:', authUser.id)
      console.log('  - Email:', authUser.email)
      console.log('  - Created:', authUser.created_at)
      console.log('  - Email confirmed:', authUser.email_confirmed_at)
    } else {
      console.log('  ❌ Auth 用户不存在')
    }
  } else {
    console.log('  ⚠️ 无法查询 auth.users:', listError?.message)
  }

  // 3. 检查是否有注册限制记录
  console.log('\n🚫 注册限制记录:')

  const { data: regAttempts, error: regError } = await supabase
    .from('registration_attempts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!regError && regAttempts && regAttempts.length > 0) {
    console.log(`  找到 ${regAttempts.length} 条注册记录:`)
    regAttempts.forEach(r => {
      console.log(`  - IP: ${r.ip_address}, 时间: ${r.created_at}, 尝试次数: ${r.attempt_count}, 锁定至: ${r.locked_until || '无'}`)
    })
  } else {
    console.log('  ✅ 无注册限制记录')
  }

  // 4. 检查邀请码尝试记录
  const { data: invAttempts, error: invError } = await supabase
    .from('invitation_code_attempts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!invError && invAttempts && invAttempts.length > 0) {
    console.log(`\n🔑 邀请码尝试记录: 找到 ${invAttempts.length} 条`)
    invAttempts.forEach(i => {
      console.log(`  - 邀请码: ${i.code}, IP: ${i.ip_address}, 尝试: ${i.attempt_count}次, 锁定至: ${i.locked_until || '无'}`)
    })
  } else {
    console.log('\n🔑 邀请码尝试记录: ✅ 无记录')
  }

  console.log('\n' + '='.repeat(60))
}

// 检查指定的手机号
const phone = process.argv[2] || '19521529803'
checkUser(phone)
  .then(() => {
    console.log('\n✅ 检查完成')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ 错误:', err)
    process.exit(1)
  })
