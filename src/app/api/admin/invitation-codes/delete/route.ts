/**
 * 删除邀请码 API
 * POST /api/admin/invitation-codes/delete
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
    const { codeId } = await request.json()

    if (!codeId) {
      return NextResponse.json({ error: '缺少邀请码ID' }, { status: 400 })
    }

    // 使用 admin client 绕过 RLS 限制
    const supabase = await createAdminClient()

    // 检查邀请码是否存在
    const { data: code, error: codeError } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('id', codeId)
      .single()

    if (codeError || !code) {
      return NextResponse.json({ error: '邀请码不存在' }, { status: 404 })
    }

    // 记录操作日志（删除前）
    await logAdminAction(
      'delete_invitation_code',
      'invitation_code',
      codeId,
      {
        code: (code as any).code,
        note: (code as any).note,
        used_count: (code as any).used_count
      }
    )

    // 删除邀请码
    const { error: deleteError } = await supabase
      .from('invitation_codes')
      .delete()
      .eq('id', codeId)

    if (deleteError) {
      console.error('Error deleting invitation code:', deleteError)
      return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '邀请码已删除'
    })
  } catch (error: any) {
    console.error('Error in delete invitation code API:', error)

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
