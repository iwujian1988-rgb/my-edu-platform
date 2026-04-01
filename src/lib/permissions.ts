/**
 * Permission System Utilities
 *
 * Provides server-side and client-side permission checking for:
 * - Feature permissions (practice modes, advanced features)
 * - Book permissions (vocabulary book access)
 * - Permission expiration checking
 */

import { getUserProfile } from './supabase/server'
import { FEATURE_PERMISSIONS, type FeaturePermission } from './permission-constants'

// Re-export for convenience
export { FEATURE_PERMISSIONS, type FeaturePermission }

/**
 * Check if user has a specific feature permission
 *
 * @param userId - User ID to check
 * @param permission - Feature permission to check
 * @returns Promise<boolean> - True if user has the permission
 *
 * @example
 * ```ts
 * import { hasFeaturePermission } from '@/lib/permissions'
 *
 * const canPlayMatchGame = await hasFeaturePermission(user.id, 'match_game')
 * ```
 */
export async function hasFeaturePermission(
  userId: string,
  permission: FeaturePermission
): Promise<boolean> {
  const profile = await getUserProfile()

  if (!profile) {
    return false
  }

  const userProfile = profile as any

  // Check if permission has expired
  if (userProfile.permission_expires_at) {
    const expiresAt = new Date(userProfile.permission_expires_at)
    if (expiresAt < new Date()) {
      return false
    }
  }

  // Check if user has the specific permission
  if (!userProfile.feature_permissions || !Array.isArray(userProfile.feature_permissions)) {
    return false
  }

  return userProfile.feature_permissions.includes(permission)
}

/**
 * Check if user has access to a specific book
 *
 * @param userId - User ID to check
 * @param bookId - Book ID to check
 * @returns Promise<boolean> - True if user has access to the book
 *
 * @example
 * ```ts
 * import { hasBookPermission } from '@/lib/permissions'
 *
 * const canAccessBook = await hasBookPermission(user.id, bookId)
 * ```
 */
export async function hasBookPermission(userId: string, bookId: string): Promise<boolean> {
  const profile = await getUserProfile()

  if (!profile) {
    return false
  }

  // Check if permission has expired
  if (profile.permission_expires_at) {
    const expiresAt = new Date(profile.permission_expires_at)
    if (expiresAt < new Date()) {
      return false
    }
  }

  // Check if user has "全部" (all) book permission
  if (profile.book_permissions && Array.isArray(profile.book_permissions)) {
    // Check for wildcard (*) permission
    if (profile.book_permissions.includes('*') || profile.book_permissions.includes('全部')) {
      return true
    }

    // Check if specific book is in permissions
    return profile.book_permissions.includes(bookId)
  }

  return false
}

/**
 * Get user's all feature permissions (non-expired)
 *
 * @returns Promise<string[]> - Array of feature permissions
 */
export async function getUserFeaturePermissions(): Promise<string[]> {
  const profile = await getUserProfile()

  if (!profile) {
    return []
  }

  // Check if permission has expired
  if (profile.permission_expires_at) {
    const expiresAt = new Date(profile.permission_expires_at)
    if (expiresAt < new Date()) {
      return []
    }
  }

  return profile.feature_permissions || []
}

/**
 * Get user's all book permissions (non-expired)
 *
 * @returns Promise<string[]> - Array of book IDs or '全部'
 */
export async function getUserBookPermissions(): Promise<string[]> {
  const profile = await getUserProfile()

  if (!profile) {
    return []
  }

  // Check if permission has expired
  if (profile.permission_expires_at) {
    const expiresAt = new Date(profile.permission_expires_at)
    if (expiresAt < new Date()) {
      return []
    }
  }

  return profile.book_permissions || []
}

/**
 * Check if user's permissions are expired or expiring soon
 *
 * @param daysThreshold - Days threshold to consider as "expiring soon" (default: 7)
 * @returns Promise<{ isExpired: boolean, isExpiringSoon: boolean, expiresAt: Date | null }>
 */
export async function checkPermissionExpiration(daysThreshold: number = 7) {
  const profile = await getUserProfile()

  if (!profile || !profile.permission_expires_at) {
    return { isExpired: false, isExpiringSoon: false, expiresAt: null }
  }

  const expiresAt = new Date(profile.permission_expires_at)
  const now = new Date()
  const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    isExpired: daysUntilExpiry < 0,
    isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= daysThreshold,
    expiresAt,
    daysUntilExpiry
  }
}

/**
 * Get user's complete permission info
 *
 * @returns Promise<UserPermissions | null>
 */
export async function getUserPermissions() {
  const profile = await getUserProfile()

  if (!profile) {
    return null
  }

  // 🔥 优化：直接计算过期检查，避免重复查询数据库
  let expirationCheck = { isExpired: false, isExpiringSoon: false, daysUntilExpiry: null }

  if (profile.permission_expires_at) {
    const expiresAt = new Date(profile.permission_expires_at)
    const now = new Date()
    const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    expirationCheck = {
      isExpired: daysUntilExpiry < 0,
      isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 7,
      daysUntilExpiry
    }
  }

  // 语言权限：未设置时默认只有英语，防止英语会员访问法语/西语词库
  const rawLanguagePackages = (profile as any).language_packages as string[] | null | undefined
  const languagePackages = normalizeLanguagePackages(rawLanguagePackages)

  return {
    featurePermissions: profile.feature_permissions || [],
    bookPermissions: profile.book_permissions || [],
    languagePackages,
    permissionExpiresAt: profile.permission_expires_at,
    isExpired: expirationCheck.isExpired,
    isExpiringSoon: expirationCheck.isExpiringSoon,
    daysUntilExpiry: expirationCheck.daysUntilExpiry,
    invitationCodeId: profile.invitation_code_id
  }
}

export interface UserPermissions {
  featurePermissions: string[]
  bookPermissions: string[]
  languagePackages: string[]
  permissionExpiresAt: string | null
  isExpired: boolean
  isExpiringSoon: boolean
  daysUntilExpiry: number | null
  invitationCodeId: string | null
}

/**
 * 标准化语言权限数组
 *
 * 规则：
 * - null/undefined/空 → 默认 ['en']（英语会员不能看其他语言）
 * - 包含 '*' → 所有语言
 */
function normalizeLanguagePackages(raw: string[] | null | undefined): string[] {
  if (!raw || raw.length === 0) {
    return ['en']
  }
  return raw
}

/**
 * 检查用户是否有权限访问指定语言的词库
 */
export function hasLanguagePermission(
  userLanguagePackages: string[],
  bookLanguage: string | null | undefined
): boolean {
  // 通配符：拥有所有语言权限
  if (userLanguagePackages.includes('*')) {
    return true
  }
  // 词库无语言标记时默认 en，仍需校验
  const targetLang = bookLanguage || 'en'
  return userLanguagePackages.includes(targetLang)
}
