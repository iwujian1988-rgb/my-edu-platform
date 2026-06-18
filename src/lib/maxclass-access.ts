import { createClient } from '@/lib/supabase/server'

const VIDEO_PERMISSION = 'video'
const FRENCH_LANGUAGE = 'fr'
const PUBLISHED_STATUS = 'published'

interface UserAccessRow {
  feature_permissions: string[] | null
  language_packages: string[] | null
  package_ids: string[] | null
  permission_expires_at: string | null
}

function hasActivePermissionWindow(user: UserAccessRow): boolean {
  const expiresAt = user.permission_expires_at
  return !expiresAt || new Date(expiresAt) > new Date()
}

function hasUnexpiredFeaturePermission(user: UserAccessRow, permission: string): boolean {
  return (user.feature_permissions || []).includes(permission)
    && hasActivePermissionWindow(user)
}

function hasFrenchLanguagePackage(user: UserAccessRow): boolean {
  const languagePackages = user.language_packages || ['en']
  return languagePackages.includes(FRENCH_LANGUAGE) || languagePackages.includes('*')
}

export async function hasFrenchVideoAccess(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('feature_permissions, language_packages, package_ids, permission_expires_at')
    .eq('id', userId)
    .single() as { data: UserAccessRow | null; error: unknown }

  if (userError || !user) {
    return false
  }

  if (!hasActivePermissionWindow(user)) {
    return false
  }

  if (
    hasUnexpiredFeaturePermission(user, VIDEO_PERMISSION)
    && hasFrenchLanguagePackage(user)
  ) {
    return true
  }

  const packageIds = user.package_ids || []
  if (packageIds.length === 0) {
    return false
  }

  const { count, error: videoError } = await supabase
    .from('videos')
    .select('id', { count: 'exact', head: true })
    .eq('status', PUBLISHED_STATUS)
    .eq('language', FRENCH_LANGUAGE)
    .overlaps('package_ids', packageIds)

  if (videoError) {
    return false
  }

  return (count || 0) > 0
}
