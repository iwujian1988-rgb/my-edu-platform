/**
 * 创建邀请码 API
 * POST /api/admin/invitation-codes/create
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 生成随机邀请码
 */
function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 排除易混淆字符
  let code = ''
  for (let i = 0; i < 8; i++) {
    if (i > 0 && i % 4 === 0) code += '-'
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const admin = await requireAdmin()

    // 解析请求体
    const { count = 1, maxUses = -1, note } = await request.json()

    if (count < 1 || count > 100) {
      return NextResponse.json({ error: '一次只能创建 1-100 个邀请码' }, { status: 400 })
    }

    const supabase = await createClient()

    // 生成邀请码
    const codes = []
    for (let i = 0; i < count; i++) {
      let code
      let attempts = 0
      const maxAttempts = 10

      // 确保邀请码唯一
      do {
        code = generateInvitationCode()
        const { data: existing } = await supabase
          .from('invitation_codes')
          .select('code')
          .eq('code', code)
          .single()

        if (!existing) break
        attempts++
      } while (attempts < maxAttempts)

      if (attempts >= maxAttempts) {
        return NextResponse.json({ error: '生成邀请码失败，请重试' }, { status: 500 })
      }

      codes.push({
        code,
        max_uses: maxUses,
        note: note || null
      })
    }

    // 批量插入数据库
    const { data: insertedCodes, error } = await supabase
      .from('invitation_codes')
      .insert(codes.map(c => ({
        ...c,
        created_by_admin_id: admin.id
      })))
      .select()

    if (error) {
      console.error('Error creating invitation codes:', error)
      return NextResponse.json({ error: '创建邀请码失败' }, { status: 500 })
    }

    // 记录操作日志
    await logAdminAction(
      'create_invitation_code',
      'invitation_code',
      insertedCodes[0].id,
      {
        count,
        codes: codes.map(c => c.code),
        max_uses: maxUses,
        note
      }
    )

    return NextResponse.json({
      success: true,
      codes: insertedCodes,
      message: `成功创建 ${count} 个邀请码`
    })
  } catch (error: any) {
    console.error('Error in create invitation code API:', error)

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
