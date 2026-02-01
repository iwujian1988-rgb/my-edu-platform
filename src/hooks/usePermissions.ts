/**
 * Client-side Permission Hook
 *
 * Provides permission checking for client components using Supabase auth
 */

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { FEATURE_PERMISSIONS } from '@/lib/permissions'

export interface UserPermissions {
  featurePermissions: string[]
  bookPermissions: string[]
  permissionExpiresAt: string | null
  isExpired: boolean
  isExpiringSoon: boolean
  daysUntilExpiry: number | null
  isLoading: boolean
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<UserPermissions>({
    featurePermissions: [],
    bookPermissions: [],
    permissionExpiresAt: null,
    isExpired: false,
    isExpiringSoon: false,
    daysUntilExpiry: null,
    isLoading: true
  })

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          console.log('[usePermissions] No user found')
          setPermissions(prev => ({ ...prev, isLoading: false }))
          return
        }

        console.log('[usePermissions] Fetching permissions for user:', user.id)

        const { data, error } = await supabase
          .from('users')
          .select('feature_permissions, book_permissions, permission_expires_at')
          .eq('id', user.id)
          .single()

        if (error || !data) {
          console.error('[usePermissions] Failed to fetch permissions:', error)
          setPermissions(prev => ({ ...prev, isLoading: false }))
          return
        }

        console.log('[usePermissions] ✅ Permissions loaded:', {
          featurePermissions: data.feature_permissions,
          bookPermissions: data.book_permissions,
          expiresAt: data.permission_expires_at
        })

        // Check expiration
        let isExpired = false
        let isExpiringSoon = false
        let daysUntilExpiry = null

        const userData = data as any

        if (userData.permission_expires_at) {
          const expiresAt = new Date(userData.permission_expires_at)
          const now = new Date()
          daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          isExpired = daysUntilExpiry < 0
          isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 7
        }

        setPermissions({
          featurePermissions: userData.feature_permissions || [],
          bookPermissions: userData.book_permissions || [],
          permissionExpiresAt: userData.permission_expires_at,
          isExpired,
          isExpiringSoon,
          daysUntilExpiry,
          isLoading: false
        })
      } catch (err) {
        console.error('Error fetching permissions:', err)
        setPermissions(prev => ({ ...prev, isLoading: false }))
      }
    }

    fetchPermissions()
  }, [])

  return permissions
}

/**
 * Check if user has a specific feature permission
 */
export function useHasFeaturePermission(permission: string): boolean {
  const { featurePermissions, isExpired, isLoading } = usePermissions()

  if (isLoading || isExpired) {
    return false
  }

  return featurePermissions.includes(permission)
}

/**
 * Check if user has access to a specific book
 */
export function useHasBookPermission(bookId: string): boolean {
  const { bookPermissions, isExpired, isLoading } = usePermissions()

  if (isLoading || isExpired) {
    return false
  }

  // Check if user has wildcard permission (* or 全部)
  if (bookPermissions.includes('*') || bookPermissions.includes('全部')) {
    return true
  }

  return bookPermissions.includes(bookId)
}
