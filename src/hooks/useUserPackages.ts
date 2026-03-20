'use client'

/**
 * 用户套餐 Hook
 *
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.2
 */

import useSWR from 'swr'
import type { UserVideoPackage } from '@/types/video'

interface UserPackagesResponse {
  items: UserVideoPackage[]
  accessible_video_ids: string[]
}

interface UseUserPackagesResult {
  packages: UserVideoPackage[]
  accessibleVideoIds: string[]
  loading: boolean
  error: Error | null
  mutate: () => void
}

const fetcher = async (url: string): Promise<UserPackagesResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch user packages')
  }
  const data = await res.json()
  return data.data
}

export function useUserPackages(): UseUserPackagesResult {
  const { data, error, isLoading, mutate } = useSWR<UserPackagesResponse>(
    '/api/user/video-packages',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 分钟内不重复请求
    }
  )

  return {
    packages: data?.items || [],
    accessibleVideoIds: data?.accessible_video_ids || [],
    loading: isLoading,
    error: error || null,
    mutate,
  }
}

/**
 * 检查用户是否有某个视频的访问权限
 */
export function useVideoAccess(videoId: string | null) {
  const { accessibleVideoIds, loading, error } = useUserPackages()

  return {
    hasAccess: videoId ? accessibleVideoIds.includes(videoId) : false,
    loading,
    error,
  }
}
