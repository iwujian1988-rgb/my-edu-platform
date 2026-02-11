import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  // 直接使用 @supabase/supabase-js，绕过 SSR 客户端
  const { createClient } = await import('@supabase/supabase-js')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createClient(url, key)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  return NextResponse.json({
    hasUser: !!data?.user,
    userId: data?.user?.id,
    error: error?.message,
    errorStatus: error?.status,
    url,
    keyLength: key?.length
  })
}
