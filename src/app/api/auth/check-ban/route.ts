import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // 🔍 Debug: 检查请求中的cookies
    const cookies = request.cookies.getAll()
    const authCookies = cookies.filter(c => c.name.includes('sb-'))
    console.log('🍪 [check-ban API] Cookies:', {
      total: cookies.length,
      authCookies: authCookies.map(c => c.name),
      hasAuthTokenCookie: authCookies.some(c => c.name.includes('auth-token'))
    })

    const supabase = await createClient()
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()

    console.log('👤 [check-ban API] getUser result:', {
      hasUser: !!user,
      userId: user?.id,
      error: getUserError?.message
    })

    if (!user) {
      console.warn('⚠️ [check-ban API] No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_banned')
      .eq('id', user.id)
      .single()

    if ((userData as any)?.is_banned) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: '账号被封禁' }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ [check-ban API] Error:', error)
    // 即使检查失败也不影响登录
    return NextResponse.json({ success: true })
  }
}
