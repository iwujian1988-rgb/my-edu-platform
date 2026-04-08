'use client'

/**
 * 卡片掌握状态 Hook
 *
 * SM-2 算法由服务端 /api/user/video-cards/review 实现
 * 客户端只做乐观更新 + API 调用，不重复计算间隔
 */

import { useCallback, useMemo, useRef } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { toast } from 'sonner'
import type { CardType, CardStatus } from '@/types/video'

interface CardProgressData {
  video_id: string
  card_type: CardType
  card_id: string
  status: CardStatus
  review_count: number
  next_review_at: string | null
  ease_factor: number
}

interface UseCardProgressOptions {
  videoId?: string
}

interface UseCardProgressResult {
  // 状态
  progressMap: Map<string, CardProgressData>
  loading: boolean
  error: Error | null

  // 操作
  updateStatus: (
    cardType: CardType,
    cardId: string,
    status: CardStatus
  ) => Promise<void>

  getCardStatus: (
    cardType: CardType,
    cardId: string
  ) => CardStatus | undefined

  getCardsToReview: () => CardProgressData[]

  // 闪卡相关
  recordFlashcardResult: (
    cardType: CardType,
    cardId: string,
    remembered: boolean
  ) => Promise<void>
}

export function useCardProgress(
  options: UseCardProgressOptions = {}
): UseCardProgressResult {
  const { videoId } = options

  // 获取卡片进度数据（使用 all=true 获取所有进度，用于显示学习状态）
  const swrKey = videoId ? `/api/user/video-cards/review?video_id=${videoId}&all=true` : null

  const { data, error, isLoading, mutate } = useSWR<CardProgressData[]>(
    swrKey,
    async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch card progress')
      const json = await res.json()
      return json.data?.items?.map((item: { card: { id: string }; card_type: string; status: CardStatus; review_count: number; next_review: string | null; ease_factor: number }) => ({
        video_id: videoId!,
        card_type: item.card_type as CardType,
        card_id: item.card.id,
        status: item.status,
        review_count: item.review_count,
        next_review_at: item.next_review,
        ease_factor: item.ease_factor,
      })) || []
    }
  )

  // 构建 Map 方便查询 - 使用 useMemo 避免每次渲染重新创建
  const progressMap = useMemo(() => {
    const map = new Map<string, CardProgressData>()
    if (data) {
      for (const item of data) {
        const key = `${item.card_type}:${item.card_id}`
        map.set(key, item)
      }
    }
    return map
  }, [data])

  // 更新卡片状态（乐观更新）
  const updateStatus = useCallback(
    async (cardType: CardType, cardId: string, status: CardStatus) => {
      if (!videoId) return

      // 将 status 转换为 quality (客户端约定: 1=忘记, 2=一般, 3=简单)
      const qualityMap: Record<CardStatus, number> = {
        unknown: 1,   // 忘记
        learning: 2,  // 一般
        known: 3,     // 简单
      }

      // 🚀 乐观更新：立即更新本地状态
      mutate(
        (currentData) => {
          if (!currentData) return currentData
          return currentData.map((item) => {
            if (item.card_type === cardType && item.card_id === cardId) {
              return { ...item, status }
            }
            return item
          })
        },
        false // 不重新验证
      )

      // 后台发送 API 请求
      try {
        const res = await fetch('/api/user/video-cards/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId,
            cardType,
            quality: qualityMap[status],
            videoId,
          }),
        })

        if (!res.ok) {
          // API 失败，回滚并提示
          mutate() // 回滚到服务器状态
          toast.error('状态更新失败，请重试')
          return
        }
        // 成功：静默完成，无需再次 mutate（已乐观更新）
      } catch (error) {
        console.error('[useCardProgress] Update error:', error)
        // 网络错误，回滚并提示
        mutate()
        toast.error('网络错误，请检查网络后重试')
      }
    },
    [videoId, mutate]
  )

  // 获取卡片状态
  const getCardStatus = useCallback(
    (cardType: CardType, cardId: string): CardStatus | undefined => {
      const key = `${cardType}:${cardId}`
      return progressMap.get(key)?.status
    },
    [progressMap]
  )

  // 获取待复习卡片
  const getCardsToReview = useCallback((): CardProgressData[] => {
    const now = new Date()
    const toReview: CardProgressData[] = []

    for (const item of progressMap.values()) {
      if (
        item.status !== 'known' &&
        (!item.next_review_at || new Date(item.next_review_at) <= now)
      ) {
        toReview.push(item)
      }
    }

    return toReview.sort((a, b) => {
      // 按下次复习时间排序
      const aTime = a.next_review_at ? new Date(a.next_review_at).getTime() : 0
      const bTime = b.next_review_at ? new Date(b.next_review_at).getTime() : 0
      return aTime - bTime
    })
  }, [progressMap])

  // 记录闪卡结果（SM-2 由服务端计算，客户端只负责发请求）
  const recordFlashcardResult = useCallback(
    async (cardType: CardType, cardId: string, remembered: boolean) => {
      const quality = remembered ? 3 : 1 // 3=简单，1=忘记

      try {
        const response = await fetch('/api/user/video-cards/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId,
            cardType,
            quality,
            videoId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('[recordFlashcardResult] API error:', {
            status: response.status,
            error: errorData,
          })
          throw new Error(`API error: ${response.status}`)
        }

        // 刷新本地缓存（从服务端拿到最新的 next_review_at 等字段）
        mutate()
      } catch (error) {
        console.error('[recordFlashcardResult] Network error:', error)
        throw error
      }
    },
    [videoId, mutate]
  )

  return {
    progressMap,
    loading: isLoading,
    error: error || null,
    updateStatus,
    getCardStatus,
    getCardsToReview,
    recordFlashcardResult,
  }
}
