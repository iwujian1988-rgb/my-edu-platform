export interface AccessProfile {
  package_ids: string[] | null; permission_expires_at: string | null; is_banned: boolean | null
}
export function hasWorkEnglishAccess(profile: AccessProfile | null, activePackageIds: readonly string[], now = Date.now()): boolean {
  if (!profile || profile.is_banned || !profile.package_ids?.some(id => activePackageIds.includes(id))) return false
  return profile.permission_expires_at === null || Date.parse(profile.permission_expires_at) > now
}
