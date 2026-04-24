/**
 * 用户权限管理 API
 * PUT /api/admin/users/[userId]/permissions - 修改用户权限和套餐
 */

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminForAPI } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import { invalidateUserCache } from '@/lib/cache/cache-invalidation'

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
      package_ids,
      apply_package_permissions = false
    } = body

    if (!change_reason) {
      return NextResponse.json({ error: '请填写变更原因' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // 获取用户当前权限
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('feature_permissions, book_permissions, language_packages, permission_expires_at, package_ids')
      .eq('id', userId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 })
      }
      console.error('Error fetching user:', fetchError)
      return NextResponse.json({ error: '查询用户失败: ' + fetchError.message }, { status: 500 })
    }

    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {}

    // 如果选择了套餐变更
    if (package_ids !== undefined) {
      updateData.package_ids = package_ids || []

      // 如果需要应用套餐默认权限（合并所有套餐的权限）
      if (apply_package_permissions && Array.isArray(package_ids) && package_ids.length > 0) {
        const { data: packages } = await supabase
          .from('invitation_packages')
          .select('feature_permissions, book_permissions, validity_days')
          .in('id', package_ids)

        if (packages && packages.length > 0) {
          // 合并所有套餐的权限
          const mergedFeatures = new Set<string>()
          const mergedBooks = new Set<string>()
          let maxValidityDays: number | null = null

          for (const pkg of packages) {
            const pkgData = pkg as Record<string, unknown>
            for (const f of (pkgData.feature_permissions as string[]) || []) {
              mergedFeatures.add(f)
            }
            for (const b of (pkgData.book_permissions as string[]) || []) {
              mergedBooks.add(b)
            }
            const days = pkgData.validity_days as number | null
            if (days !== null) {
              if (maxValidityDays === null || days > maxValidityDays) {
                maxValidityDays = days
              }
            }
          }

          // 应用套餐默认权限（如果前端没有手动指定）
          updateData.feature_permissions = feature_permissions ?? Array.from(mergedFeatures)
          updateData.book_permissions = book_permissions ?? Array.from(mergedBooks)

          // 如果前端没有手动指定过期时间，使用最长的套餐有效期
          if (permission_expires_at === undefined && maxValidityDays !== null) {
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + maxValidityDays)
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
      // 没有选择套餐变更，只更新权限
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('log_permission_change', {
        user_id_param: userId,
        admin_id_param: admin.id,
        old_feature_permissions_param: (currentUser as Record<string, unknown>).feature_permissions || [],
        old_book_permissions_param: (currentUser as Record<string, unknown>).book_permissions || [],
        old_permission_expires_at_param: (currentUser as Record<string, unknown>).permission_expires_at,
        new_feature_permissions_param: updateData.feature_permissions || [],
        new_book_permissions_param: updateData.book_permissions || [],
        new_permission_expires_at_param: updateData.permission_expires_at,
        change_reason_param: change_reason,
        change_type_param: package_ids ? 'package_change' : 'adjustment'
      })
    } catch (logError) {
      console.error('Failed to log permission change:', logError)
    }

    // 记录管理员操作日志
    await logAdminAction(
      'update_user_permissions',
      'user',
      userId,
      {
        change_reason,
        package_changed: package_ids !== undefined,
        old_package_ids: (currentUser as Record<string, unknown>).package_ids,
        new_package_ids: package_ids,
        apply_package_permissions,
        old_permissions: {
          feature_count: ((currentUser as Record<string, unknown>).feature_permissions as unknown[] || []).length,
          book_count: ((currentUser as Record<string, unknown>).book_permissions as unknown[] || []).length,
          language_count: ((currentUser as Record<string, unknown>).language_packages as unknown[] || []).length
        },
        new_permissions: {
          feature_count: ((updateData.feature_permissions as unknown[]) || []).length,
          book_count: ((updateData.book_permissions as unknown[]) || []).length,
          language_count: ((updateData.language_packages as unknown[]) || []).length
        }
      }
    )

    // 清除该用户的缓存（权限变更后立即生效）
    invalidateUserCache(userId)

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
