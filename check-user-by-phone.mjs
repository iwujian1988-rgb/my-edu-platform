import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env.local file
const envContent = readFileSync('.env.local', 'utf-8')
const lines = envContent.split('\n')
const NEXT_PUBLIC_SUPABASE_URL = lines.find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim()?.replace(/^"|"$/g, '')
const SUPABASE_SERVICE_ROLE_KEY = lines.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))?.split('=')[1]?.trim()?.replace(/^"|"$/g, '')

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function checkUser() {
  const phone = '19521529803'

  // 查询用户
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', phone)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${users?.length || 0} users with phone ${phone}`)

  // 如果没找到，查询最近注册的5个用户
  if (!users || users.length === 0) {
    console.log('\n查询最近注册的5个用户:')
    const { data: recentUsers, error: recentError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) {
      console.error('Error:', recentError)
    } else {
      console.log(JSON.stringify(recentUsers, null, 2))
    }
  } else {
    console.log(JSON.stringify(users, null, 2))
  }
}

checkUser()
