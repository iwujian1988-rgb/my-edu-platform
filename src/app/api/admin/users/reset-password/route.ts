/**
 * 重置用户密码 API
 * POST /api/admin/users/reset-password
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const admin = await requireAdmin()

    // 解析请求体
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 })
    }

    const supabase = await createClient()

    // 检查用户是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 获取对应的 auth.user 记录
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)

    if (authError || !authUser) {
      return NextResponse.json({ error: '用户认证信息不存在' }, { status: 404 })
    }

    // 使用 Supabase Admin API 生成密码重置链接
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: (user as any).email
    })

    if (resetError) {
      console.error('Error generating password reset link:', resetError)
      return NextResponse.json({ error: '生成重置链接失败' }, { status: 500 })
    }

    // 记录操作日志
    await logAdminAction(
      'reset_password',
      'user',
      userId,
      {
        user_email: (user as any).email,
        user_nickname: (user as any).nickname
      }
    )

    return NextResponse.json({
      success: true,
      message: '密码重置链接已生成',
      resetLink: resetData.properties?.action_link
    })
  } catch (error: any) {
    console.error('Error in reset-password API:', error)

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
