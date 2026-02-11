import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { email, password } = body

  const url = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODg1MzgsImV4cCI6MjA4MzE2NDUzOH0.1rUusdU-SyWMYNiiAfjrDtSFlcxlwn4FOv0X8bJC7Sk'

  // 使用 fetch 直接请求，添加更多 headers 模拟浏览器
  const loginUrl = `${url}/auth/v1/token?grant_type=password`

  // 创建一个全新的 Request 对象，避免 Next.js 的默认 headers 干扰
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
      // @ts-ignore - Next.js fetch 扩展
      // 禁用 Next.js 的默认处理
      next: undefined
    } as any)

    clearTimeout(timeoutId)

    const result = await response.json()

    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      data: result
    })
  } catch (error: any) {
    clearTimeout(timeoutId)
    return NextResponse.json({
      error: error.message,
      errorName: error.name
    }, { status: 500 })
  }
}
