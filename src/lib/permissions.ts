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

  const expirationCheck = await checkPermissionExpiration()

  return {
    featurePermissions: profile.feature_permissions || [],
    bookPermissions: profile.book_permissions || [],
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
  permissionExpiresAt: string | null
  isExpired: boolean
  isExpiringSoon: boolean
  daysUntilExpiry: number | null
  invitationCodeId: string | null
}
