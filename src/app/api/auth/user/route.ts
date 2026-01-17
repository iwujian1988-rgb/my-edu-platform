import { getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/auth/user
 * 获取当前登录用户的基本信息
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email
    })
  } catch (error) {
    console.error('Error in GET /api/auth/user:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
