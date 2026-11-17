import type { VideoLanguage } from '@/types/video'

export const VIDEO_BINDINGS_PATH = '/api/admin/package-video-bindings'
export const VIDEO_BINDING_PAGE_SIZE = 20
export const VIDEO_BINDING_BULK_PAGE_SIZE = 100
export const MAX_VIDEO_BINDING_CHANGES = 2000

export type VideoBindingChanges = Record<string, boolean>
export interface VideoBindingOption {
  id: string
  title: string
  language: VideoLanguage
  package_ids: string[] | null
}
export interface VideoBindingPage {
  items: VideoBindingOption[]
  total: number
}
export interface VideoBindingResult {
  succeeded: string[]
  failed: { videoId: string; error: string }[]
}

export function applyVideoPackageBinding(packageIds: readonly string[] | null, packageId: string, enabled: boolean): string[] {
  const existing = packageIds ?? []
  return enabled ? [...new Set([...existing, packageId])] : existing.filter(id => id !== packageId)
}
