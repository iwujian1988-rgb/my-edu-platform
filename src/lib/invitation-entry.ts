import { safeReturnPath } from './auth-return-path'
import { WORK_ENGLISH_PATH, WORK_ENGLISH_PERMISSION } from './work-english/constants'

/** Registration destinations follow the package that the admin attached to the code. */
export function packageEntryPath(features: readonly string[] | null | undefined): string | null {
  if (features?.includes(WORK_ENGLISH_PERMISSION)) return WORK_ENGLISH_PATH
  if (features?.includes('video')) return '/videos'
  return null
}

export function invitationRegistrationPath(code: string, destination?: string | null): string {
  const path = safeReturnPath(destination)
  return `/register?code=${encodeURIComponent(code)}${path ? `&redirect=${encodeURIComponent(path)}` : ''}`
}

export function registrationReturnPath(packagePath: string | null | undefined, requested: string | null): string | null {
  const request = safeReturnPath(requested)
  // Keep a lesson deep link, but a work-English registration must not land in another product.
  if (packagePath === WORK_ENGLISH_PATH) {
    const pathname = request ? new URL(request, 'https://maxnote.top').pathname : null
    return pathname === WORK_ENGLISH_PATH || pathname?.startsWith(`${WORK_ENGLISH_PATH}/`) ? request : WORK_ENGLISH_PATH
  }
  return request
}
