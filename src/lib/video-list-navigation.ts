const VIDEO_LIST_PATH = '/videos'
const VALIDATION_ORIGIN = 'https://video-list.invalid'

export function getVideoListReturnUrl(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return VIDEO_LIST_PATH
  try {
    const url = new URL(value, VALIDATION_ORIGIN)
    if (url.origin !== VALIDATION_ORIGIN || url.pathname !== VIDEO_LIST_PATH) return VIDEO_LIST_PATH
    return `${VIDEO_LIST_PATH}${url.search}`
  } catch {
    return VIDEO_LIST_PATH
  }
}

export function getVideoDetailHref(videoId: string, returnUrl?: string): string {
  const path = `${VIDEO_LIST_PATH}/${encodeURIComponent(videoId)}`
  if (!returnUrl) return path
  const params = new URLSearchParams({ returnTo: getVideoListReturnUrl(returnUrl) })
  return `${path}?${params.toString()}`
}
