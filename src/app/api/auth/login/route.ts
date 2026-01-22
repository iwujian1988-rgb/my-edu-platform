import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

// Phone to fake email conversion
function phoneToEmail(phone: string): string {
  return `${phone}@phone.xiaoyu.com`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, password } = body

    if (!phone || !password) {
      return NextResponse.json(
        { error: '手机号和密码不能为空' },
        { status: 400 }
      )
    }

    // Validate phone format
    if (!/^[0-9]{11}$/.test(phone)) {
      return NextResponse.json(
        { error: '请输入正确的11位手机号' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const email = phoneToEmail(phone)

    console.log('[API Login] Attempting login for:', phone)

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      console.error('[API Login] Error:', error)
      return NextResponse.json(
        { error: '手机号或密码错误' },
        { status: 401 }
      )
    }

    console.log('[API Login] Success, user ID:', data.user.id)

    // Check if user is banned
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_banned, ban_reason')
      .eq('id', data.user.id)
      .single()

    if (userError) {
      console.error('[API Login] Error checking ban status:', userError)
      return NextResponse.json(
        { error: '登录失败，请重试' },
        { status: 500 }
      )
    }

    if ((userData as any)?.is_banned) {
      console.log('[API Login] User is banned')
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: '你的账号被封禁 可联系店铺客服' },
        { status: 403 }
      )
    }

    // Update last login time (async, don't wait)
    const supabaseAdmin = await createAdminClient()
    // 🔧 Fix: Supabase query doesn't have .catch(), use void to run as fire-and-forget
    void (async () => {
      try {
        await supabaseAdmin
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id)
      } catch (err) {
        console.error('[API Login] Failed to update last_login_at:', err)
      }
    })()

    console.log('[API Login] Login completed successfully')

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      }
    })

  } catch (error: any) {
    console.error('[API Login] Exception:', error)
    return NextResponse.json(
      { error: error.message || '登录失败，请重试' },
      { status: 500 }
    )
  }
}
