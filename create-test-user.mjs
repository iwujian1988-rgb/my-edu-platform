import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:8000'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestUser() {
  const phone = '13800138000'
  const password = 'test123456'
  const email = `${phone}@phone.xiaoyu.com`
  
  console.log('Creating test user...')
  console.log('Phone:', phone)
  console.log('Email:', email)
  
  // 1. 创建 auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        phone_number: phone
      }
    }
  })
  
  if (authError && !authError.message?.includes('already registered')) {
    console.error('Error creating auth user:', authError)
    return
  }
  
  const userId = authData.user?.id
  console.log('Auth user ID:', userId)
  
  // 2. 创建 public user
  if (userId) {
    const { error: dbError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        phone_number: phone,
        full_name: '测试用户'
      })
    
    if (dbError) {
      console.error('Error creating public user:', dbError)
    } else {
      console.log('✅ Public user created')
    }
    
    // 3. 初始化 quota
    const { error: quotaError } = await supabase
      .from('user_quotas')
      .upsert({
        user_id: userId,
        daily_smart_import_limit: 500,
        daily_smart_import_used: 0
      })
    
    if (quotaError) {
      console.error('Error creating quota:', quotaError)
    } else {
      console.log('✅ Quota initialized')
    }
  }
  
  console.log('✅ Test user ready!')
  console.log('Phone:', phone)
  console.log('Password:', password)
}

createTestUser().catch(console.error)
