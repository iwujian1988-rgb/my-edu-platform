/** Keep product entry points on this origin, including through login/register switches. */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  try {
    const decoded = decodeURIComponent(value)
    if (/[\\\u0000-\u0020]/.test(decoded) || decoded.startsWith('//')) return null
    const url = new URL(value, 'https://maxnote.top')
    if (url.origin !== 'https://maxnote.top' || ['/login', '/register'].includes(url.pathname)) return null
    return url.pathname + url.search + url.hash
  } catch {
    return null
  }
}

export function authEntryPath(page: 'login' | 'register', destination?: string | null): string {
  const path = safeReturnPath(destination)
  return `/${page}${path ? `?redirect=${encodeURIComponent(path)}` : ''}`
}
