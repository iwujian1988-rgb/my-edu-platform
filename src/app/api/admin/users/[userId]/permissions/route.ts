/**
 * 用户权限管理 API
 * PUT /api/admin/users/[userId]/permissions - 修改用户权限和套餐
 */

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminForAPI } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await requireAdminForAPI()
    const { userId } = await params
    const body = await request.json()
    const {
      feature_permissions,
      book_permissions,
      language_packages,
      permission_expires_at,
      change_reason,
      package_id,
      apply_package_permissions = false
    } = body

    if (!change_reason) {
      return NextResponse.json({ error: '请填写变更原因' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // 获取用户当前权限（先尝试带 package_id 的查询）
    let currentUser: Record<string, any> | null = null
    let hasPackageIdColumn = true

    // 首先尝试带 package_id 的查询
    const { data: userWithPackage, error: fetchError } = await supabase
      .from('users')
      .select('feature_permissions, book_permissions, language_packages, permission_expires_at, package_id')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching user with package_id:', fetchError)

      // 如果是列不存在的错误，尝试不查询 package_id
      if (fetchError.message?.includes('package_id') || fetchError.code === '42703') {
        hasPackageIdColumn = false
        const { data: userWithoutPackage, error: retryError } = await supabase
          .from('users')
          .select('feature_permissions, book_permissions, language_packages, permission_expires_at')
          .eq('id', userId)
          .single()

        if (retryError) {
          console.error('Retry fetch also failed:', retryError)
          if (retryError.code === 'PGRST116') {
            return NextResponse.json({ error: '用户不存在' }, { status: 404 })
          }
          return NextResponse.json({ error: '查询用户失败: ' + retryError.message }, { status: 500 })
        }

        currentUser = userWithoutPackage ? { ...(userWithoutPackage as object), package_id: null } : null
      } else if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 })
      } else {
        return NextResponse.json({ error: '查询用户失败: ' + fetchError.message }, { status: 500 })
      }
    } else {
      currentUser = userWithPackage
    }

    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 构建更新数据
    const updateData: Record<string, any> = {}

    // 如果选择了新套餐
    if (package_id !== undefined) {
      // 只有当 package_id 列存在时才更新
      if (hasPackageIdColumn) {
        updateData.package_id = package_id || null
      }

      // 如果需要应用套餐默认权限
      if (apply_package_permissions && package_id) {
        const { data: pkg } = await supabase
          .from('invitation_packages')
          .select('feature_permissions, book_permissions, validity_days')
          .eq('id', package_id)
          .single()

        if (pkg) {
          // 应用套餐默认权限（如果前端没有手动指定）
          updateData.feature_permissions = feature_permissions ?? ((pkg as any).feature_permissions || [])
          updateData.book_permissions = book_permissions ?? ((pkg as any).book_permissions || [])

          // 如果前端没有手动指定过期时间，使用套餐有效期
          if (permission_expires_at === undefined && (pkg as any).validity_days) {
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + (pkg as any).validity_days)
            updateData.permission_expires_at = expiresAt.toISOString()
          } else {
            updateData.permission_expires_at = permission_expires_at || null
          }
        }
      } else {
        // 不应用套餐权限，使用前端传来的值
        if (feature_permissions !== undefined) {
          updateData.feature_permissions = feature_permissions || []
        }
        if (book_permissions !== undefined) {
          updateData.book_permissions = book_permissions || []
        }
        if (permission_expires_at !== undefined) {
          updateData.permission_expires_at = permission_expires_at || null
        }
      }
    } else {
      // 没有选择新套餐，只更新权限
      updateData.feature_permissions = feature_permissions || []
      updateData.book_permissions = book_permissions || []
      updateData.permission_expires_at = permission_expires_at || null
    }

    // 语言包始终更新
    if (language_packages !== undefined) {
      updateData.language_packages = language_packages || []
    }

    // 更新用户
    const { data: updatedUser, error } = await (supabase as any)
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user permissions:', error)
      return NextResponse.json({ error: '更新用户权限失败: ' + error.message }, { status: 500 })
    }

    // 记录操作日志（手动记录权限变更）- 使用 try-catch 包装，不影响主流程
    try {
      await (supabase as any).rpc('log_permission_change', {
        user_id_param: userId,
        admin_id_param: admin.id,
        old_feature_permissions_param: currentUser.feature_permissions || [],
        old_book_permissions_param: currentUser.book_permissions || [],
        old_permission_expires_at_param: currentUser.permission_expires_at,
        new_feature_permissions_param: updateData.feature_permissions || [],
        new_book_permissions_param: updateData.book_permissions || [],
        new_permission_expires_at_param: updateData.permission_expires_at,
        change_reason_param: change_reason,
        change_type_param: package_id ? 'package_change' : 'adjustment'
      })
    } catch (logError) {
      console.error('Failed to log permission change:', logError)
      // 不中断流程
    }

    // 记录管理员操作日志
    await logAdminAction(
      'update_user_permissions',
      'user',
      userId,
      {
        change_reason,
        package_changed: package_id !== undefined,
        old_package_id: currentUser.package_id,
        new_package_id: package_id,
        apply_package_permissions,
        old_permissions: {
          feature_count: (currentUser.feature_permissions || []).length,
          book_count: (currentUser.book_permissions || []).length,
          language_count: (currentUser.language_packages || []).length
        },
        new_permissions: {
          feature_count: (updateData.feature_permissions || []).length,
          book_count: (updateData.book_permissions || []).length,
          language_count: (updateData.language_packages || []).length
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

    return NextResponse.json({ error: '服务器错误: ' + (error.message || '未知错误') }, { status: 500 })
  }
}
