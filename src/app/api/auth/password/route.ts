import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const AUTH_TIMEOUT_MS = 15_000
const PASSWORD_GRANT = 'password'
const AUTH_API_VERSION_HEADER = 'X-Supabase-Api-Version'
const AUTH_API_VERSION = '2024-01-01'
const LOGIN_BODY = z.object({
  email: z.string().regex(/^\d{11}@phone\.xiaoyu\.com$/),
  password: z.string().min(1),
  gotrue_meta_security: z.object({ captcha_token: z.string().optional() }).optional(),
})
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store', [AUTH_API_VERSION_HEADER]: AUTH_API_VERSION }

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'bad_json', msg: '登录请求格式错误' }, { status: 400, headers: NO_STORE_HEADERS })
  }

  const parsed = LOGIN_BODY.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ code: 'validation_failed', msg: '请输入11位手机号和密码' }, { status: 400, headers: NO_STORE_HEADERS })
  }

  try {
    const endpoint = new URL('/auth/v1/token', process.env.NEXT_PUBLIC_SUPABASE_URL!)
    endpoint.searchParams.set('grant_type', PASSWORD_GRANT)
    // Only the public key is needed; never use admin credentials to authenticate a password.
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Content-Type': 'application/json',
        [AUTH_API_VERSION_HEADER]: AUTH_API_VERSION,
      },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    })
    const payload = await upstream.text()
    // Return GoTrue's response intact so the browser SDK can persist its normal session.
    return new NextResponse(payload, {
      status: upstream.status,
      headers: {
        ...NO_STORE_HEADERS,
        'Content-Type': 'application/json',
        [AUTH_API_VERSION_HEADER]: upstream.headers.get(AUTH_API_VERSION_HEADER) || AUTH_API_VERSION,
      },
    })
  } catch (error: unknown) {
    console.error('[Password Login] Auth service unavailable', {
      name: error instanceof Error ? error.name : 'UnknownError',
    })
    return NextResponse.json(
      { code: 'auth_service_unavailable', msg: '登录服务暂时连接失败，请稍后重试' },
      { status: 503, headers: NO_STORE_HEADERS }
    )
  }
}
