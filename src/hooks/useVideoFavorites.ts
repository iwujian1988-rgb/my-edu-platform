'use client'

/**
 * 收藏功能 Hook
 *
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0
 */

import { useState, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import type { UserFavorite, CardType } from '@/types/video'

interface UseVideoFavoritesOptions {
  videoId?: string
}

interface UseVideoFavoritesResult {
  favorites: UserFavorite[]
  loading: boolean
  error: Error | null

  // 查询
  isFavorited: (itemType: UserFavorite['item_type'], itemId: string) => boolean
  getFavoriteId: (itemType: UserFavorite['item_type'], itemId: string) => string | null

  // 操作
  addFavorite: (
    itemType: UserFavorite['item_type'],
    itemId: string,
    note?: string
  ) => Promise<UserFavorite | null>

  removeFavorite: (favoriteId: string) => Promise<boolean>

  updateNote: (favoriteId: string, note: string) => Promise<boolean>

  toggleFavorite: (
    itemType: UserFavorite['item_type'],
    itemId: string,
    note?: string
  ) => Promise<boolean> // 返回新的收藏状态
}

export function useVideoFavorites(
  options: UseVideoFavoritesOptions = {}
): UseVideoFavoritesResult {
  const { videoId } = options

  // 获取收藏列表
  const { data, error, isLoading } = useSWR<UserFavorite[]>(
    videoId ? `/api/user/video-favorites?video_id=${videoId}` : '/api/user/video-favorites',
    async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch favorites')
      const json = await res.json()
      return json.data?.items || []
    }
  )

  const favorites = data || []

  // 检查是否已收藏
  const isFavorited = useCallback(
    (itemType: UserFavorite['item_type'], itemId: string): boolean => {
      return favorites.some(
        (f) => f.item_type === itemType && f.item_id === itemId
      )
    },
    [favorites]
  )

  // 获取收藏 ID
  const getFavoriteId = useCallback(
    (itemType: UserFavorite['item_type'], itemId: string): string | null => {
      const favorite = favorites.find(
        (f) => f.item_type === itemType && f.item_id === itemId
      )
      return favorite?.id || null
    },
    [favorites]
  )

  // 添加收藏
  const addFavorite = useCallback(
    async (
      itemType: UserFavorite['item_type'],
      itemId: string,
      note?: string
    ): Promise<UserFavorite | null> => {
      try {
        const res = await fetch('/api/user/video-favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_type: itemType,
            item_id: itemId,
            video_id: videoId,
            note,
          }),
        })

        if (!res.ok) throw new Error('Failed to add favorite')

        const json = await res.json()
        const newFavorite = json.data as UserFavorite

        // 更新缓存
        mutate(
          videoId ? `/api/user/video-favorites?video_id=${videoId}` : '/api/user/video-favorites'
        )

        return newFavorite
      } catch (error) {
        console.error('[useVideoFavorites] Add error:', error)
        return null
      }
    },
    [videoId]
  )

  // 移除收藏
  const removeFavorite = useCallback(
    async (favoriteId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/user/video-favorites/${favoriteId}`, {
          method: 'DELETE',
        })

        if (!res.ok) throw new Error('Failed to remove favorite')

        // 更新缓存
        mutate(
          videoId ? `/api/user/video-favorites?video_id=${videoId}` : '/api/user/video-favorites'
        )

        return true
      } catch (error) {
        console.error('[useVideoFavorites] Remove error:', error)
        return false
      }
    },
    [videoId]
  )

  // 更新笔记
  const updateNote = useCallback(
    async (favoriteId: string, note: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/user/video-favorites/${favoriteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note }),
        })

        if (!res.ok) throw new Error('Failed to update note')

        // 更新缓存
        mutate(
          videoId ? `/api/user/video-favorites?video_id=${videoId}` : '/api/user/video-favorites'
        )

        return true
      } catch (error) {
        console.error('[useVideoFavorites] Update note error:', error)
        return false
      }
    },
    [videoId]
  )

  // 切换收藏状态
  const toggleFavorite = useCallback(
    async (
      itemType: UserFavorite['item_type'],
      itemId: string,
      note?: string
    ): Promise<boolean> => {
      const currentFavoriteId = getFavoriteId(itemType, itemId)

      if (currentFavoriteId) {
        // 已收藏，移除
        const success = await removeFavorite(currentFavoriteId)
        return !success // 返回 false 表示已取消收藏
      } else {
        // 未收藏，添加
        const result = await addFavorite(itemType, itemId, note)
        return !!result // 返回 true 表示已添加收藏
      }
    },
    [getFavoriteId, removeFavorite, addFavorite]
  )

  return {
    favorites,
    loading: isLoading,
    error: error || null,
    isFavorited,
    getFavoriteId,
    addFavorite,
    removeFavorite,
    updateNote,
    toggleFavorite,
  }
}
