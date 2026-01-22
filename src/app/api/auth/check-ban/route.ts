import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
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
    // 即使检查失败也不影响登录
    return NextResponse.json({ success: true })
  }
}
