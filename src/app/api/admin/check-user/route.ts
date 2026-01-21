import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/check-user?phone=xxx
 * 检查用户注册状态
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const phone = searchParams.get('phone')

    if (!phone) {
      return NextResponse.json(
        { error: '缺少手机号参数' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()
    const email = `${phone}@phone.xiaoyu.com`

    // 1. 检查 public.users 表
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phone)
      .single()

    // 2. 检查 auth.users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
    const authUser = (users as any[])?.find((u: any) => u.email === email)

    return NextResponse.json({
      phone,
      email,
      publicUser: publicUser ? {
        exists: true,
        id: (publicUser as any).id,
        email: (publicUser as any).email,
        phone_number: (publicUser as any).phone_number,
        created_at: (publicUser as any).created_at,
        is_banned: (publicUser as any).is_banned,
        ban_reason: (publicUser as any).ban_reason
      } : {
        exists: false,
        error: publicError?.message
      },
      authUser: authUser ? {
        exists: true,
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        email_confirmed_at: authUser.email_confirmed_at,
        last_sign_in_at: authUser.last_sign_in_at
      } : {
        exists: false
      },
      recommendation: !publicUser && !authUser ? '可以注册' : '已存在，不能重复注册'
    })
  } catch (error: any) {
    console.error('Error checking user:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
