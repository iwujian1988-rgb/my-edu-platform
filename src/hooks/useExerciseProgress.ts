'use client'

/**
 * 练习答题进度 Hook
 *
 * SWR + optimistic update 模式（复用 useCardProgress 的模式）
 * - progressMap: Map<exerciseId, { isCorrect, attempts }>
 * - recordAnswer: 乐观更新 + POST API + 失败 rollback
 */

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

export interface ExerciseProgressItem {
  isCorrect: boolean
  attempts: number
}

interface UseExerciseProgressOptions {
  videoId: string
  /** 服务端预取的初始数据，避免首次加载闪烁 */
  initialData?: Array<{ exerciseId: string; isCorrect: boolean; attempts: number }>
}

interface UseExerciseProgressResult {
  progressMap: Map<string, ExerciseProgressItem> | null
  loading: boolean
  recordAnswer: (exerciseId: string, isCorrect: boolean) => void
}

export function useExerciseProgress(
  options: UseExerciseProgressOptions
): UseExerciseProgressResult {
  const { videoId, initialData } = options

  const swrKey = `/api/user/exercise-progress?video_id=${videoId}`

  const { data, error, isLoading, mutate } = useSWR<{
    data: { items: Array<{ exercise_id: string; is_correct: boolean; attempts: number }> }
  }>(
    swrKey,
    async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch exercise progress')
      return res.json()
    },
    {
      fallbackData: initialData
        ? { data: { items: initialData.map(item => ({
            exercise_id: item.exerciseId,
            is_correct: item.isCorrect,
            attempts: item.attempts,
          })) } }
        : undefined,
    }
  )

  const progressMap = useMemo(() => {
    const map = new Map<string, ExerciseProgressItem>()
    if (data?.data?.items) {
      for (const item of data.data.items) {
        map.set(item.exercise_id, {
          isCorrect: item.is_correct,
          attempts: item.attempts,
        })
      }
    }
    return map
  }, [data])

  const recordAnswer = useCallback(
    (exerciseId: string, isCorrect: boolean) => {
      // 乐观更新：立即更新本地缓存
      mutate(
        (currentData) => {
          if (!currentData) return currentData
          const items = currentData.data.items.map((item) => {
            if (item.exercise_id === exerciseId) {
              return {
                ...item,
                is_correct: isCorrect,
                attempts: item.attempts + 1,
              }
            }
            return item
          })

          // 如果是新记录（之前不存在），追加
          const exists = items.some(item => item.exercise_id === exerciseId)
          if (!exists) {
            items.push({ exercise_id: exerciseId, is_correct: isCorrect, attempts: 1 })
          }

          return { data: { items } }
        },
        false
      )

      // 后台 POST
      fetch('/api/user/exercise-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId, isCorrect }),
      })
        .then((res) => {
          if (!res.ok) {
            mutate() // rollback
            toast.error('答题记录保存失败，请重试')
          }
        })
        .catch(() => {
          mutate() // rollback
          toast.error('网络错误，请检查网络后重试')
        })
    },
    [mutate]
  )

  return {
    progressMap,
    loading: isLoading && !data,
    recordAnswer,
  }
}
