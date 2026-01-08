/**
 * Permission Display Components
 *
 * Components for displaying user permissions and expiration warnings
 */

'use client'

import { AlertCircle, Clock, CheckCircle2, XCircle, Lock } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { FEATURE_PERMISSIONS } from '@/lib/permission-constants'

/**
 * Permission Expiration Warning Banner
 * Displays a warning if permissions are expired or expiring soon
 */
export function PermissionWarningBanner() {
  const { isExpired, isExpiringSoon, daysUntilExpiry, permissionExpiresAt, isLoading } = usePermissions()

  if (isLoading || !permissionExpiresAt) {
    return null
  }

  if (isExpired) {
    return (
      <div className="bg-red-50 border-[3px] border-red-300 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <XCircle className="text-red-600 size-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-red-800">您的权限已过期</p>
            <p className="text-sm text-red-700 mt-1">
              您的学习权限已于 {new Date(permissionExpiresAt).toLocaleDateString('zh-CN')} 过期。
              请联系管理员续费以继续使用全部功能。
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isExpiringSoon) {
    return (
      <div className="bg-yellow-50 border-[3px] border-yellow-300 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Clock className="text-yellow-600 size-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-yellow-800">
              您的权限即将过期（剩余 {daysUntilExpiry} 天）
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              您的学习权限将于 {new Date(permissionExpiresAt).toLocaleDateString('zh-CN')} 过期。
              请及时联系管理员续费。
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

/**
 * Permission Info Card
 * Displays user's current permissions
 */
export function PermissionInfoCard() {
  const { featurePermissions, bookPermissions, permissionExpiresAt, isLoading } = usePermissions()

  if (isLoading) {
    return <div className="text-gray-500">加载中...</div>
  }

  const hasAllBooks = bookPermissions.includes('*') || bookPermissions.includes('全部')
  const hasUnlimited = !permissionExpiresAt

  return (
    <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <CheckCircle2 className="text-green-600" size={24} />
        我的权限
      </h3>

      {/* Validity Period */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 font-semibold mb-1">有效期</p>
        <p className="text-lg font-bold text-gray-800">
          {hasUnlimited ? (
            <span className="text-green-600">永久有效</span>
          ) : permissionExpiresAt ? (
            new Date(permissionExpiresAt).toLocaleDateString('zh-CN')
          ) : (
            <span className="text-gray-500">未设置</span>
          )}
        </p>
      </div>

      {/* Feature Permissions */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 font-semibold mb-2">功能权限</p>
        <div className="flex flex-wrap gap-2">
          {featurePermissions.length === 0 ? (
            <span className="text-gray-400 text-sm">暂无功能权限</span>
          ) : (
            featurePermissions.map((permission) => (
              <span
                key={permission}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold border-[2px] border-blue-300"
              >
                {getPermissionLabel(permission)}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Book Permissions */}
      <div>
        <p className="text-sm text-gray-600 font-semibold mb-2">词库权限</p>
        <div className="flex flex-wrap gap-2">
          {bookPermissions.length === 0 ? (
            <span className="text-gray-400 text-sm">暂无词库权限</span>
          ) : hasAllBooks ? (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm font-semibold border-[2px] border-purple-300">
              全部词库
            </span>
          ) : (
            <span className="text-gray-600 text-sm">
              可访问 {bookPermissions.length} 个词库
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Permission Gate Component
 * Wraps content that requires specific permissions
 */
interface PermissionGateProps {
  feature?: string
  bookId?: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({ feature, bookId, fallback, children }: PermissionGateProps) {
  const { featurePermissions, bookPermissions, isExpired, isLoading } = usePermissions()

  if (isLoading) {
    return <div className="text-gray-500">检查权限中...</div>
  }

  if (isExpired) {
    return fallback || <PermissionExpiredMessage />
  }

  // Check feature permission
  if (feature && !featurePermissions.includes(feature)) {
    return fallback || <NoPermissionMessage feature={feature} />
  }

  // Check book permission
  if (bookId) {
    const hasAllBooks = bookPermissions.includes('*') || bookPermissions.includes('全部')
    if (!hasAllBooks && !bookPermissions.includes(bookId)) {
      return fallback || <NoBookPermissionMessage />
    }
  }

  return <>{children}</>
}

/**
 * No Permission Message
 */
function NoPermissionMessage({ feature }: { feature: string }) {
  return (
    <div className="bg-gray-50 border-[3px] border-gray-300 rounded-xl p-8 text-center">
      <Lock className="text-gray-400 size-12 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-gray-800 mb-2">暂无权限</h3>
      <p className="text-gray-600 text-sm">
        您没有使用「{getPermissionLabel(feature)}」功能的权限。
        请联系管理员获取更多权限。
      </p>
    </div>
  )
}

/**
 * No Book Permission Message
 */
function NoBookPermissionMessage() {
  return (
    <div className="bg-gray-50 border-[3px] border-gray-300 rounded-xl p-8 text-center">
      <Lock className="text-gray-400 size-12 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-gray-800 mb-2">暂无权限</h3>
      <p className="text-gray-600 text-sm">
        您没有访问此词库的权限。请联系管理员获取更多权限。
      </p>
    </div>
  )
}

/**
 * Permission Expired Message
 */
function PermissionExpiredMessage() {
  return (
    <div className="bg-red-50 border-[3px] border-red-300 rounded-xl p-8 text-center">
      <AlertCircle className="text-red-600 size-12 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-red-800 mb-2">权限已过期</h3>
      <p className="text-red-700 text-sm">
        您的学习权限已过期，请及时联系管理员续费。
      </p>
    </div>
  )
}

/**
 * Get permission display label
 */
function getPermissionLabel(permission: string): string {
  const labels: Record<string, string> = {
    [FEATURE_PERMISSIONS.MATCH_GAME]: '连连看',
    [FEATURE_PERMISSIONS.FLASHCARDS]: '单词卡片',
    [FEATURE_PERMISSIONS.DICTATION]: '听写练习',
    [FEATURE_PERMISSIONS.SPELLING_CHECK]: '拼写检查',
    [FEATURE_PERMISSIONS.AI_FEATURES]: 'AI功能',
    [FEATURE_PERMISSIONS.CUSTOM_BOOKS]: '自定义词库',
    [FEATURE_PERMISSIONS.EXPORT_DATA]: '数据导出',
    [FEATURE_PERMISSIONS.STUDY_STATS]: '学习统计',
    [FEATURE_PERMISSIONS.MISTAKE_BOOK]: '错题本',
    [FEATURE_PERMISSIONS.STUDY_CALENDAR]: '学习日历',
  }

  return labels[permission] || permission
}
