/**
 * 用户权限管理 API
 * PUT /api/admin/users/[userId]/permissions - 修改用户权限
 */

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { userId } = await params
    const body = await request.json()
    const {
      feature_permissions,
      book_permissions,
      language_packages,
      permission_expires_at,
      change_reason
    } = body

    if (!change_reason) {
      return NextResponse.json({ error: '请填写变更原因' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // 获取用户当前权限
    const { data: currentUser } = await supabase
      .from('users')
      .select('feature_permissions, book_permissions, language_packages, permission_expires_at')
      .eq('id', userId)
      .single()

    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 更新用户权限
    const { data: updatedUser, error } = await (supabase as any)
      .from('users')
      .update({
        feature_permissions: feature_permissions || [],
        book_permissions: book_permissions || [],
        language_packages: language_packages || [],
        permission_expires_at: permission_expires_at || null
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user permissions:', error)
      return NextResponse.json({ error: '更新用户权限失败' }, { status: 500 })
    }

    // 记录操作日志（手动记录权限变更）
    await (supabase as any).rpc('log_permission_change', {
      user_id_param: userId,
      admin_id_param: admin.id,
      old_feature_permissions_param: (currentUser as any).feature_permissions || [],
      old_book_permissions_param: (currentUser as any).book_permissions || [],
      old_permission_expires_at_param: (currentUser as any).permission_expires_at,
      new_feature_permissions_param: feature_permissions || [],
      new_book_permissions_param: book_permissions || [],
      new_permission_expires_at_param: permission_expires_at || null,
      change_reason_param: change_reason,
      change_type_param: 'adjustment'
    })

    // 记录管理员操作日志
    await logAdminAction(
      'update_user_permissions',
      'user',
      userId,
      {
        change_reason,
        old_permissions: {
          feature_count: ((currentUser as any).feature_permissions || []).length,
          book_count: ((currentUser as any).book_permissions || []).length,
          language_count: ((currentUser as any).language_packages || []).length
        },
        new_permissions: {
          feature_count: (feature_permissions || []).length,
          book_count: (book_permissions || []).length,
          language_count: (language_packages || []).length
        }
      }
    )

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: '用户权限更新成功'
    })
  } catch (error: any) {
    console.error('Error in update user permissions API:', error)

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
