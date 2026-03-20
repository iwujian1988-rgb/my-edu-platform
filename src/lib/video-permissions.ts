/**
 * 视频学习模块 - 权限检查逻辑
 *
 * 重构版本：复用现有 invitation_packages 套餐系统
 *
 * 权限链路：
 * 1. invitation_packages (邀请码套餐) ← videos.package_ids (视频关联的套餐)
 * 2. users.package_id → 检查是否在 videos.package_ids 中
 * 3. users.feature_permissions → 检查是否包含 'video'
 */

import { createClient } from '@/lib/supabase/server'
import type { AccessCheckResponse } from '@/types/video'

// ============================================
// 类型定义
// ============================================

export interface VideoAccessResult {
  hasAccess: boolean
  packageInfo?: {
    id: string
    name: string
    expiresAt: string | null
  }
}

export interface UserPackageInfo {
  id: string
  package_id: string
  package_name: string
  activated_at: string
  expires_at: string | null
  is_active: boolean
}

// ============================================
// 核心权限检查函数
// ============================================

/**
 * 检查用户是否有某个视频的访问权限
 *
 * 权限检查逻辑（满足任一条件即可）：
 * 1. 视频未关联任何套餐（公开视频）
 * 2. 用户的 package_id 在视频的 package_ids 中
 * 3. 用户有 'video' 功能权限
 *
 * @param userId - 用户 ID
 * @param videoId - 视频 ID
 * @returns 是否有访问权限
 */
export async function hasVideoAccess(
  userId: string,
  videoId: string
): Promise<boolean> {
  const supabase = await createClient()

  // 1. 获取视频信息（包含 package_ids）
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('id, package_ids, status')
    .eq('id', videoId)
    .single()

  if (videoError || !video) {
    return false
  }

  // 2. 如果视频未发布，无权限
  if ((video as any).status !== 'published') {
    return false
  }

  // 3. 检查视频是否关联了套餐（所有视频必须关联套餐）
  const packageIds = (video as any).package_ids as string[] | null
  if (!packageIds || packageIds.length === 0) {
    // 视频未关联任何套餐，不允许访问（业务规则：所有视频必须关联套餐）
    return false
  }

  // 4. 获取用户信息（package_id 和 feature_permissions）
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, package_id, feature_permissions, permission_expires_at')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return false
  }

  // 5. 检查用户是否有 'video' 功能权限
  const featurePermissions = (user as any).feature_permissions as string[] | null
  const permissionExpiresAt = (user as any).permission_expires_at as string | null

  if (featurePermissions?.includes('video')) {
    // 检查权限是否过期
    if (!permissionExpiresAt || new Date(permissionExpiresAt) > new Date()) {
      return true
    }
  }

  // 6. 检查用户的 package_id 是否在视频的 package_ids 中
  const userPackageId = (user as any).package_id as string | null
  if (userPackageId && packageIds.includes(userPackageId)) {
    return true
  }

  return false
}

/**
 * 获取视频访问检查结果（包含套餐信息）
 *
 * @param userId - 用户 ID
 * @param videoId - 视频 ID
 * @returns 访问结果和套餐信息
 */
export async function getVideoAccessResult(
  userId: string,
  videoId: string
): Promise<VideoAccessResult> {
  const supabase = await createClient()

  // 1. 获取视频信息
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('id, package_ids, status')
    .eq('id', videoId)
    .single()

  if (videoError || !video) {
    return { hasAccess: false }
  }

  if ((video as any).status !== 'published') {
    return { hasAccess: false }
  }

  const packageIds = (video as any).package_ids as string[] | null

  // 视频未关联任何套餐，不允许访问（业务规则：所有视频必须关联套餐）
  if (!packageIds || packageIds.length === 0) {
    return { hasAccess: false }
  }

  // 2. 获取用户信息
  const { data: user, error: userError } = await supabase
    .from('users')
    .select(`
      id,
      package_id,
      feature_permissions,
      permission_expires_at
    `)
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return { hasAccess: false }
  }

  const featurePermissions = (user as any).feature_permissions as string[] | null
  const permissionExpiresAt = (user as any).permission_expires_at as string | null
  const userPackageId = (user as any).package_id as string | null

  // 检查功能权限
  if (featurePermissions?.includes('video')) {
    if (!permissionExpiresAt || new Date(permissionExpiresAt) > new Date()) {
      return { hasAccess: true }
    }
  }

  // 检查套餐权限
  if (userPackageId && packageIds.includes(userPackageId)) {
    // 获取套餐信息
    const { data: pkg } = await supabase
      .from('invitation_packages')
      .select('id, name')
      .eq('id', userPackageId)
      .single()

    return {
      hasAccess: true,
      packageInfo: pkg ? {
        id: pkg.id,
        name: pkg.name,
        expiresAt: permissionExpiresAt,
      } : undefined,
    }
  }

  return { hasAccess: false }
}

/**
 * 获取用户可访问的所有视频 ID 列表
 *
 * @param userId - 用户 ID
 * @returns 视频 ID 数组
 */
export async function getAccessibleVideoIds(userId: string): Promise<string[]> {
  const supabase = await createClient()

  // 1. 获取用户信息
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, package_id, feature_permissions, permission_expires_at')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return []
  }

  const userPackageId = (user as any).package_id as string | null
  const featurePermissions = (user as any).feature_permissions as string[] | null
  const permissionExpiresAt = (user as any).permission_expires_at as string | null

  // 2. 构建查询条件
  let query = supabase
    .from('videos')
    .select('id')
    .eq('status', 'published')

  // 如果用户有 'video' 功能权限（且未过期）
  const hasVideoPermission = featurePermissions?.includes('video') &&
    (!permissionExpiresAt || new Date(permissionExpiresAt) > new Date())

  if (hasVideoPermission) {
    // 有功能权限，可以访问所有视频
    const { data, error } = await query
    if (error || !data) return []
    return data.map(v => v.id)
  }

  // 如果用户有套餐，获取套餐关联的视频 + 公开视频
  if (userPackageId) {
    // 获取公开视频 + 套餐关联的视频
    const { data: videos, error } = await supabase.rpc('get_accessible_videos_for_package', {
      p_package_id: userPackageId
    })

    if (error) {
      // 如果 RPC 不存在，使用普通查询
      const { data, error: queryError } = await supabase
        .from('videos')
        .select('id, package_ids')
        .eq('status', 'published')

      if (queryError || !data) return []

      // 过滤出公开视频或包含用户套餐的视频
      return data
        .filter(v => {
          const pids = (v as any).package_ids as string[] | null
          return !pids || pids.length === 0 || pids.includes(userPackageId!)
        })
        .map(v => v.id)
    }

    return videos?.map((v: any) => v.id) || []
  }

  // 没有套餐，无法访问任何视频（所有视频必须关联套餐）
  return []
}

/**
 * 检查用户是否有任意视频权限
 *
 * @param userId - 用户 ID
 * @returns 是否有视频权限
 */
export async function hasAnyVideoPackage(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: user, error } = await supabase
    .from('users')
    .select('id, package_id, feature_permissions, permission_expires_at')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return false
  }

  const featurePermissions = (user as any).feature_permissions as string[] | null
  const permissionExpiresAt = (user as any).permission_expires_at as string | null
  const packageId = (user as any).package_id as string | null

  // 检查功能权限
  if (featurePermissions?.includes('video')) {
    if (!permissionExpiresAt || new Date(permissionExpiresAt) > new Date()) {
      return true
    }
  }

  // 检查是否有套餐
  return !!packageId
}

/**
 * 获取用户的套餐信息（用于视频权限展示）
 *
 * @param userId - 用户 ID
 * @returns 用户套餐列表
 */
export async function getUserVideoPackages(userId: string): Promise<UserPackageInfo[]> {
  const supabase = await createClient()

  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      package_id,
      permission_expires_at,
      created_at,
      invitation_packages(
        id,
        name
      )
    `)
    .eq('id', userId)
    .single()

  if (error || !user) {
    return []
  }

  const pkg = (user as any).invitation_packages as { id: string; name: string } | null

  if (!pkg || !(user as any).package_id) {
    return []
  }

  return [{
    id: (user as any).package_id,
    package_id: pkg.id,
    package_name: pkg.name,
    activated_at: (user as any).created_at,
    expires_at: (user as any).permission_expires_at,
    is_active: !(user as any).permission_expires_at ||
      new Date((user as any).permission_expires_at) > new Date(),
  }]
}

/**
 * 获取视频的访问权限检查信息（用于前台展示）
 *
 * @param userId - 用户 ID
 * @param videoId - 视频 ID
 * @returns 访问检查响应
 */
export async function getVideoAccessCheck(
  userId: string,
  videoId: string
): Promise<AccessCheckResponse> {
  const supabase = await createClient()

  // 1. 获取视频信息和关联的套餐
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('id, package_ids, status')
    .eq('id', videoId)
    .single()

  if (videoError || !video) {
    return { has_access: false, packages: [] }
  }

  const packageIds = (video as any).package_ids as string[] | null

  // 视频未关联任何套餐，不允许访问（业务规则：所有视频必须关联套餐）
  if (!packageIds || packageIds.length === 0) {
    return { has_access: false, packages: [] }
  }

  // 2. 获取关联的套餐信息
  const { data: packages } = await supabase
    .from('invitation_packages')
    .select('id, name, is_active')
    .in('id', packageIds)

  if (!packages) {
    return { has_access: false, packages: [] }
  }

  // 3. 获取用户套餐
  const userPackages = await getUserVideoPackages(userId)
  const userPackageIds = new Set(userPackages.map(p => p.package_id))

  // 4. 构建响应
  const packageList = packages
    .filter(p => p.is_active)
    .map(p => ({
      id: p.id,
      name: p.name,
      user_has_access: userPackageIds.has(p.id),
    }))

  const hasAccess = packageList.some(p => p.user_has_access)

  return { has_access: hasAccess, packages: packageList }
}

// ============================================
// 管理后台权限检查
// ============================================

/**
 * 检查视频是否已关联至少一个套餐
 * 用于发布前验证
 *
 * @param videoId - 视频 ID
 * @returns 是否已关联套餐
 */
export async function isVideoLinkedToPackage(videoId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: video, error } = await supabase
    .from('videos')
    .select('id, package_ids')
    .eq('id', videoId)
    .single()

  if (error || !video) {
    return false
  }

  const packageIds = (video as any).package_ids as string[] | null
  return !!(packageIds && packageIds.length > 0)
}

/**
 * 获取视频关联的所有套餐
 *
 * @param videoId - 视频 ID
 * @returns 套餐列表
 */
export async function getVideoPackages(videoId: string): Promise<Array<{
  id: string
  name: string
  is_active: boolean
}>> {
  const supabase = await createClient()

  // 1. 获取视频的 package_ids
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('id, package_ids')
    .eq('id', videoId)
    .single()

  if (videoError || !video) {
    return []
  }

  const packageIds = (video as any).package_ids as string[] | null

  if (!packageIds || packageIds.length === 0) {
    return []
  }

  // 2. 获取套餐信息
  const { data: packages, error } = await supabase
    .from('invitation_packages')
    .select('id, name, is_active')
    .in('id', packageIds)

  if (error || !packages) {
    return []
  }

  return packages
}

/**
 * 更新视频关联的套餐
 *
 * @param videoId - 视频 ID
 * @param packageIds - 套餐 ID 数组
 * @returns 是否成功
 */
export async function updateVideoPackages(
  videoId: string,
  packageIds: string[]
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('videos')
    .update({ package_ids: packageIds })
    .eq('id', videoId)

  return !error
}

// ============================================
// 辅助函数
// ============================================

/**
 * 检查套餐是否已过期
 *
 * @param expiresAt - 过期时间
 * @returns 是否已过期
 */
export function isPackageExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

/**
 * 计算剩余天数
 *
 * @param expiresAt - 过期时间
 * @returns 剩余天数，null 表示永久有效
 */
export function getRemainingDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null

  const now = new Date()
  const expires = new Date(expiresAt)
  const diffMs = expires.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * 格式化过期时间显示
 *
 * @param expiresAt - 过期时间
 * @returns 格式化字符串
 */
export function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return '永久有效'

  const remaining = getRemainingDays(expiresAt)

  if (remaining === null) return '永久有效'
  if (remaining === 0) return '今天到期'
  if (remaining === 1) return '明天到期'
  if (remaining <= 7) return `${remaining}天后到期`
  if (remaining <= 30) return `${Math.ceil(remaining / 7)}周后到期`

  const expires = new Date(expiresAt)
  return `${expires.getFullYear()}/${expires.getMonth() + 1}/${expires.getDate()} 到期`
}
