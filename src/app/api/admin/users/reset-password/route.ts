/**
 * 重置用户密码 API
 * POST /api/admin/users/reset-password
 */

import { createAdminClient } from '@/lib/supabase/server'
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

    // 使用 admin client 绕过 RLS 限制
    const supabase = await createAdminClient()

    // 检查用户是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 生成安全的随机临时密码（包含大小写字母、数字和特殊字符）
    const generateTempPassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
      let password = ''
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return password
    }

    const tempPassword = generateTempPassword()

    // 使用 Supabase Admin API 直接更新用户密码
    // 这会使旧密码立即失效
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: tempPassword }
    )

    if (updateError) {
      console.error('Error resetting password:', updateError)
      return NextResponse.json({ error: '重置密码失败' }, { status: 500 })
    }

    // 记录操作日志
    await logAdminAction(
      'reset_password',
      'user',
      userId,
      {
        user_email: (user as any).email,
        user_nickname: (user as any).full_name
      }
    )

    return NextResponse.json({
      success: true,
      message: `密码已重置！新临时密码：${tempPassword}`,
      tempPassword: tempPassword,
      userPhone: (user as any).phone_number
    })
  } catch (error: any) {
    console.error('Error in reset-password API:', error)

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
