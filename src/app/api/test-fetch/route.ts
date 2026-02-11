import { NextResponse } from 'next/server'

export async function GET() {
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODg1MzgsImV4cCI6MjA4MzE2NDUzOH0.1rUusdU-SyWMYNiiAfjrDtSFlcxlwn4FOv0X8bJC7Sk'
  const url = 'https://snnrjnpcmdsdlyldvvps.supabase.co/auth/v1/token?grant_type=password'

  // 使用原生 fetch，完全模拟独立脚本
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      email: '15652936305@phone.xiaoyu.com',
      password: 'wj5236016'
    })
  })

  const result = await response.json()

  return NextResponse.json({
    status: response.status,
    ok: response.ok,
    result
  })
}
