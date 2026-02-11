import { NextResponse } from 'next/server'

export async function GET() {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const expected = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODg1MzgsImV4cCI6MjA4MzE2NDUzOH0.1rUusdU-SyWMYNiiAfjrDtSFlcxlwn4FOv0X8bJC7Sk'

  // 尝试用环境变量中的 key 登录
  const { createClient } = await import('@supabase/supabase-js')
  const supabase1 = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, envKey!)
  const result1 = await supabase1.auth.signInWithPassword({
    email: '15652936305@phone.xiaoyu.com',
    password: 'wj5236016'
  })

  // 尝试用硬编码的 key 登录
  const supabase2 = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, expected)
  const result2 = await supabase2.auth.signInWithPassword({
    email: '15652936305@phone.xiaoyu.com',
    password: 'wj5236016'
  })

  return NextResponse.json({
    envKey: envKey?.substring(0, 20) + '...',
    expected: expected.substring(0, 20) + '...',
    match: envKey === expected,
    envKeyLogin: {
      hasUser: !!result1.data.user,
      error: result1.error?.message
    },
    hardcodedLogin: {
      hasUser: !!result2.data.user,
      userId: result2.data.user?.id,
      error: result2.error?.message
    }
  })
}
