'use client'

/**
 * 卡片掌握状态 Hook
 *
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0
 * 实现 SM-2 艾宾浩斯遗忘曲线算法
 */

import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
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

// SM-2 算法参数
const SM2_PARAMS = {
  MIN_EASE_FACTOR: 1.3,
  DEFAULT_EASE_FACTOR: 2.5,
  EASE_FACTOR_DELTA: {
    EASY: 0.1,
    GOOD: 0,
    HARD: -0.2,
  },
  INTERVALS: {
    // 复习间隔（天）
    FIRST: 1,
    SECOND: 6,
    EASY_BONUS: 1.3,
  },
}

// 计算下次复习时间
function calculateNextReview(
  easeFactor: number,
  reviewCount: number,
  quality: number // 0-5，5=完美回忆，0=完全忘记
): { nextReviewDays: number; newEaseFactor: number } {
  let newEaseFactor =
    easeFactor +
    (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

  newEaseFactor = Math.max(SM2_PARAMS.MIN_EASE_FACTOR, newEaseFactor)

  let nextReviewDays: number

  if (quality < 3) {
    // 忘记了，重新开始
    nextReviewDays = 1
  } else if (reviewCount === 0) {
    nextReviewDays = SM2_PARAMS.INTERVALS.FIRST
  } else if (reviewCount === 1) {
    nextReviewDays = SM2_PARAMS.INTERVALS.SECOND
  } else {
    nextReviewDays = Math.round(
      SM2_PARAMS.INTERVALS.SECOND * newEaseFactor * Math.pow(1.5, reviewCount - 2)
    )
  }

  return { nextReviewDays, newEaseFactor }
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

  // 更新卡片状态
  const updateStatus = useCallback(
    async (cardType: CardType, cardId: string, status: CardStatus) => {
      if (!videoId) return

      // 将 status 转换为 quality (SM-2 算法)
      const qualityMap: Record<CardStatus, number> = {
        unknown: 0,
        learning: 2,
        known: 5,
      }

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

        if (!res.ok) throw new Error('Failed to update status')

        // 刷新本地缓存
        mutate()
      } catch (error) {
        console.error('[useCardProgress] Update error:', error)
        throw error
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

  // 记录闪卡结果
  const recordFlashcardResult = useCallback(
    async (cardType: CardType, cardId: string, remembered: boolean) => {
      const key = `${cardType}:${cardId}`
      const current = progressMap.get(key)

      const quality = remembered ? 5 : 2 // 5=完美，2=忘记
      const { nextReviewDays, newEaseFactor } = calculateNextReview(
        current?.ease_factor || SM2_PARAMS.DEFAULT_EASE_FACTOR,
        current?.review_count || 0,
        quality
      )

      const nextReviewAt = new Date()
      nextReviewAt.setDate(nextReviewAt.getDate() + nextReviewDays)

      // 调用 API 更新
      await fetch('/api/user/video-cards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          cardType,
          quality,
          videoId,
        }),
      })

      // 刷新本地缓存
      mutate()
    },
    [progressMap, videoId, mutate]
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
