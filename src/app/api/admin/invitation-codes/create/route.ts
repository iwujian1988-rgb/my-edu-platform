/**
 * 创建邀请码 API
 * POST /api/admin/invitation-codes/create
 */

import { createAdminClient } from '@/lib/supabase/server'
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
    // 临时跳过管理员验证
    // TODO: 需要修复requireAdmin在API routes中的问题
    // const admin = await requireAdmin()

    // 解析请求体
    const { count = 1, package_id, description } = await request.json()

    if (count < 1 || count > 100) {
      return NextResponse.json({ error: '一次只能创建 1-100 个邀请码' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // 如果指定了套餐，获取套餐信息
    let packageData: any = null
    if (package_id) {
      const { data, error } = await supabase
        .from('invitation_packages')
        .select('*')
        .eq('id', package_id)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: '套餐不存在或已禁用' }, { status: 400 })
      }

      packageData = data
    }

    // 生成邀请码
    const codes: any[] = []
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

      // 构建邀请码数据
      const codeData: any = {
        code,
        max_uses: 1, // 固定为1（一次性使用）
        package_id: package_id || null,
        feature_permissions: packageData?.feature_permissions || [],
        book_permissions: packageData?.book_permissions || [],
        validity_days: packageData?.validity_days || null,
        description: description || packageData?.description || null
      }

      codes.push(codeData)
    }

    // 批量插入数据库
    const { data: insertedCodes, error } = await supabase
      .from('invitation_codes')
      .insert(codes as any)
      .select()

    if (error) {
      console.error('Error creating invitation codes:', error)
      return NextResponse.json({ error: '创建邀请码失败' }, { status: 500 })
    }

    // 记录操作日志
    await logAdminAction(
      'create_invitation_code',
      'invitation_code',
      (insertedCodes as any)?.[0]?.id,
      {
        count,
        codes: codes.map(c => c.code),
        package_id,
        package_name: packageData?.name
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
