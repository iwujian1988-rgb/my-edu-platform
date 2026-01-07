/**
 * 封禁/解封用户 API
 * POST /api/admin/users/ban
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
    const { userId, reason, isBanned } = await request.json()

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

    // 封禁/解封用户
    const { error: updateError } = await supabase
      .from('users')
      .update({
        banned_at: isBanned ? new Date().toISOString() : null,
        banned_reason: isBanned ? reason : null
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user ban status:', updateError)
      return NextResponse.json({ error: '操作失败' }, { status: 500 })
    }

    // 记录操作日志
    await logAdminAction(
      isBanned ? 'ban_user' : 'unban_user',
      'user',
      userId,
      {
        user_email: user.email,
        user_nickname: user.nickname,
        reason
      }
    )

    return NextResponse.json({
      success: true,
      message: isBanned ? '用户已封禁' : '用户已解封'
    })
  } catch (error: any) {
    console.error('Error in ban API:', error)

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
