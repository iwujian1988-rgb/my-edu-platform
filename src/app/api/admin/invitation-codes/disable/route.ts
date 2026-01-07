/**
 * 禁用/启用邀请码 API
 * POST /api/admin/invitation-codes/disable
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
    const { codeId, isDisabled } = await request.json()

    if (!codeId) {
      return NextResponse.json({ error: '缺少邀请码ID' }, { status: 400 })
    }

    const supabase = await createClient()

    // 检查邀请码是否存在
    const { data: code, error: codeError } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('id', codeId)
      .single()

    if (codeError || !code) {
      return NextResponse.json({ error: '邀请码不存在' }, { status: 404 })
    }

    // 禁用/启用邀请码
    const { error: updateError } = await supabase
      .from('invitation_codes')
      .update({
        disabled_at: isDisabled ? new Date().toISOString() : null
      })
      .eq('id', codeId)

    if (updateError) {
      console.error('Error updating invitation code:', updateError)
      return NextResponse.json({ error: '操作失败' }, { status: 500 })
    }

    // 记录操作日志
    await logAdminAction(
      isDisabled ? 'disable_invitation_code' : 'enable_invitation_code',
      'invitation_code',
      codeId,
      {
        code: code.code,
        note: code.note
      }
    )

    return NextResponse.json({
      success: true,
      message: isDisabled ? '邀请码已禁用' : '邀请码已启用'
    })
  } catch (error: any) {
    console.error('Error in disable invitation code API:', error)

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
