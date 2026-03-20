/**
 * 管理员认证系统
 * 提供管理员登录、权限验证、操作日志等功能
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

/**
 * 管理员用户类型
 */
export interface AdminUser {
  id: string
  user_id: string
  role: 'super_admin' | 'content_admin' | 'support'
  name: string
  email: string
  is_active: boolean
  last_login_at: string | null
}

/**
 * 权限类型
 */
export type Permission =
  | 'view_users'
  | 'ban_users'
  | 'reset_password'
  | 'view_invitation_codes'
  | 'create_invitation_codes'
  | 'manage_invitation_codes'
  | 'manage_books'
  | 'import_books'
  | 'review_books'
  | 'view_stats'
  | 'view_audit_logs'
  | 'manage_administrators'
  | 'modify_settings'

/**
 * 角色权限映射
 */
const ROLE_PERMISSIONS: Record<AdminUser['role'], Permission[]> = {
  super_admin: [
    '*' as Permission
  ], // 超级管理员拥有所有权限
  content_admin: [
    'view_users',
    'view_invitation_codes',
    'create_invitation_codes',
    'manage_invitation_codes',
    'manage_books',
    'import_books',
    'review_books',
    'view_stats',
    'ban_users',
    'view_audit_logs'
  ],
  support: [
    'view_users',
    'ban_users',
    'view_invitation_codes',
    'view_stats',
    'view_audit_logs'
  ]
}

/**
 * 获取当前登录的管理员
 * @returns 管理员用户对象，如果未登录则返回 null
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return null
    }

    // 查询管理员信息
    const { data: admin, error: adminError } = await supabase
      .from('administrators')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (adminError || !admin) {
      return null
    }

    return admin as AdminUser
  } catch (error) {
    console.error('Error getting current admin:', error)
    return null
  }
}

/**
 * 要求管理员登录（用于服务端组件）
 * 如果未登录，重定向到登录页
 * @returns 管理员用户对象
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin()

  if (!admin) {
    redirect('/admin/login')
  }

  return admin
}

/**
 * 要求超级管理员权限
 * 如果不是超级管理员，重定向到仪表盘并显示错误
 * @returns 管理员用户对象
 */
export async function requireSuperAdmin(): Promise<AdminUser> {
  const admin = await requireAdmin()

  if (admin.role !== 'super_admin') {
    redirect('/admin/dashboard?error=insufficient_permissions')
  }

  return admin
}

/**
 * 检查管理员是否拥有指定权限
 * @param admin 管理员用户对象
 * @param permission 权限名称
 * @returns 是否拥有权限
 */
export function hasPermission(
  admin: AdminUser | null,
  permission: Permission
): boolean {
  if (!admin) return false

  // 超级管理员拥有所有权限
  if (admin.role === 'super_admin') return true

  // 检查角色权限列表
  const permissions = ROLE_PERMISSIONS[admin.role]
  return permissions?.includes(permission) || false
}

/**
 * 要求拥有指定权限
 * 如果没有权限，抛出错误
 * @param permission 权限名称
 */
export async function requirePermission(permission: Permission): Promise<void> {
  const admin = await getCurrentAdmin()

  if (!admin) {
    throw new Error('UNAUTHORIZED')
  }

  if (!hasPermission(admin, permission)) {
    throw new Error('INSUFFICIENT_PERMISSIONS')
  }
}

/**
 * 记录管理员操作日志
 * @param action 操作类型
 * @param targetType 目标类型（可选）
 * @param targetId 目标ID（可选）
 * @param details 详细信息（可选）
 */
export async function logAdminAction(
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) return

    const supabase = await createClient()

    // 获取请求信息
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') ||
                      headersList.get('x-real-ip') ||
                      null
    const userAgent = headersList.get('user-agent') || null

    // @ts-ignore - Supabase type inference issue
    await supabase.from('admin_audit_logs').insert({
      admin_id: admin.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details || {},
      ip_address: ipAddress,
      user_agent: userAgent
    })
  } catch (error) {
    console.error('Error logging admin action:', error)
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 管理员登录
 * @param email 邮箱
 * @param password 密码
 * @returns 登录结果
 */
export async function adminLogin(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; admin?: AdminUser }> {
  const supabase = await createClient()

  // 1. 使用 Supabase Auth 登录（带重试机制）
  let retries = 3
  let authData: any = null
  let authError: any = null

  while (retries > 0) {
    try {
      const result = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (result.data?.user && !result.error) {
        authData = result.data
        authError = null
        break // 成功，退出重试
      }

      authError = result.error
      if (authError) {
        console.warn(`Login attempt failed, ${retries - 1} retries left:`, authError.message)
      }
    } catch (err: any) {
      authError = err
      console.warn(`Login error, ${retries - 1} retries left:`, err.message)
    }

    retries--
    if (retries > 0) {
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  if (authError || !authData?.user) {
    return {
      success: false,
      error: '邮箱或密码错误'
    }
  }

  try {
    // 2. 检查是否是管理员
    const { data: admin, error: adminError } = await supabase
      .from('administrators')
      .select('*')
      .eq('user_id', authData.user.id)
      .eq('is_active', true)
      .single()

    if (adminError || !admin) {
      // 登录成功但不是管理员，先登出
      await supabase.auth.signOut()
      return {
        success: false,
        error: '您不是管理员或账户已被禁用'
      }
    }

    // 3. 更新最后登录时间
    await supabase
      .from('administrators')
      // @ts-ignore - Supabase type inference issue
      .update({ last_login_at: new Date().toISOString() })
      // @ts-ignore - Supabase type inference issue
      .eq('id', admin.id)

    // 4. 记录登录日志
    await logAdminAction('admin_login', 'administrator', (admin as any).id, {
      email
    })

    return {
      success: true,
      admin: admin as AdminUser
    }
  } catch (error) {
    console.error('Admin login error:', error)
    return {
      success: false,
      error: '登录失败，请稍后重试'
    }
  }
}

/**
 * 管理员登出
 */
export async function adminLogout(): Promise<void> {
  try {
    const supabase = await createClient()

    // 记录登出日志
    await logAdminAction('admin_logout')

    // 执行登出
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Admin logout error:', error)
  }
}

/**
 * 获取所有权限列表（用于权限管理界面）
 */
export function getAllPermissions(): Permission[] {
  return [
    'view_users',
    'ban_users',
    'reset_password',
    'view_invitation_codes',
    'create_invitation_codes',
    'manage_invitation_codes',
    'manage_books',
    'import_books',
    'review_books',
    'view_stats',
    'view_audit_logs',
    'manage_administrators',
    'modify_settings'
  ]
}

/**
 * 获取角色显示名称
 */
export function getRoleDisplayName(role: AdminUser['role']): string {
  const roleNames = {
    super_admin: '超级管理员',
    content_admin: '内容管理员',
    support: '客服人员'
  }
  return roleNames[role] || role
}

/**
 * 获取权限显示名称
 */
export function getPermissionDisplayName(permission: Permission): string {
  const permissionNames: Record<Permission, string> = {
    view_users: '查看用户',
    ban_users: '封禁用户',
    reset_password: '重置密码',
    view_invitation_codes: '查看邀请码',
    create_invitation_codes: '创建邀请码',
    manage_invitation_codes: '管理邀请码',
    manage_books: '管理词库',
    import_books: '导入词库',
    review_books: '审核词库',
    view_stats: '查看统计',
    view_audit_logs: '查看日志',
    manage_administrators: '管理管理员',
    modify_settings: '修改设置'
  }
  return permissionNames[permission] || permission
}

/**
 * API路由专用的管理员验证错误类
 */
export class UnauthorizedError extends Error {
  constructor(message: string = 'UNAUTHORIZED') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * API路由专用：要求管理员登录
 * 与requireAdmin()不同，此函数不使用redirect()，适合API路由
 * @throws UnauthorizedError 如果未登录
 * @returns 管理员用户对象
 */
export async function requireAdminForAPI(): Promise<AdminUser> {
  const admin = await getCurrentAdmin()

  if (!admin) {
    throw new UnauthorizedError()
  }

  return admin
}

/**
 * API路由专用：安全的管理员验证
 * 返回结果对象而不是抛出错误，方便API路由使用
 * @returns { success: boolean, admin?, error?, code?, status? }
 */
export async function checkAdminForAPI(): Promise<{
  success: boolean
  admin?: AdminUser
  error?: string
  code?: string
  status?: number
}> {
  try {
    const admin = await getCurrentAdmin()

    if (!admin) {
      return {
        success: false,
        error: '未授权访问',
        code: 'UNAUTHORIZED',
        status: 401,
      }
    }

    return { success: true, admin }
  } catch (error) {
    return {
      success: false,
      error: '服务器错误',
      code: 'INTERNAL_ERROR',
      status: 500,
    }
  }
}

