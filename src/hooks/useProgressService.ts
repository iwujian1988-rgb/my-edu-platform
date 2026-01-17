/**
 * useProgressService - ProgressService React Hook
 *
 * 提供进度管理的React Hook接口
 *
 * @date 2026-01-14
 */

'use client'

import { useCallback, useEffect, useRef } from 'react'
import { progressService, type ProgressData, type StatsData } from '@/services/progressService'

/**
 * Hook选项
 */
export interface UseProgressServiceOptions {
  // 是否在组件卸载时自动保存
  saveOnUnmount?: boolean
  // 页面卸载时使用sendBeacon
  useSendBeacon?: boolean
}

/**
 * Hook返回值
 */
export interface UseProgressServiceReturn {
  // 更新听写进度
  updateDictationProgress: (data: ProgressData, options?: { immediate?: boolean }) => Promise<void>
  // 更新单词状态
  updateWordStatus: (wordId: string, bookId: string, oldStatus: string, newStatus: 'known' | 'unknown' | 'fuzzy') => Promise<void>
  // 加载本地进度
  loadLocalProgress: (bookId: string, scopeType: string) => ProgressData | null
  // 加载本地统计数据
  loadLocalStats: (bookId: string) => StatsData | null
  // 保存统计数据
  saveStats: (bookId: string, stats: StatsData) => void
  // 获取待处理任务数
  getPendingCount: () => number
  // 页面卸载前处理
  onBeforeUnload: (data: ProgressData) => Promise<void>
}

/**
 * useProgressService Hook
 *
 * @param options - Hook选项
 * @returns ProgressService方法集合
 *
 * @example
 * ```tsx
 * const { updateDictationProgress, updateWordStatus } = useProgressService({
 *   saveOnUnmount: true,
 *   useSendBeacon: true
 * })
 *
 * // 更新进度
 * await updateDictationProgress({
 *   bookId: 'book-123',
 *   scopeType: 'known',
 *   currentIndex: 5,
 *   totalWords: 100
 * })
 *
 * // 更新单词状态
 * await updateWordStatus('word-1', 'book-123', 'new', 'known')
 * ```
 */
export function useProgressService(options: UseProgressServiceOptions = {}): UseProgressServiceReturn {
  const { saveOnUnmount = false, useSendBeacon = true } = options

  // 用于存储当前的进度数据
  const currentProgressRef = useRef<ProgressData | null>(null)

  /**
   * 更新听写进度
   */
  const updateDictationProgress = useCallback(
    async (data: ProgressData, opts?: { immediate?: boolean }) => {
      // 保存当前进度数据（用于卸载时恢复）
      currentProgressRef.current = data

      // 调用服务更新
      await progressService.updateDictationProgress(data, opts)
    },
    []
  )

  /**
   * 更新单词状态
   */
  const updateWordStatus = useCallback(
    async (wordId: string, bookId: string, oldStatus: string, newStatus: 'known' | 'unknown' | 'fuzzy') => {
      await progressService.updateWordStatus(wordId, bookId, oldStatus, newStatus)
    },
    []
  )

  /**
   * 加载本地进度
   */
  const loadLocalProgress = useCallback((bookId: string, scopeType: string) => {
    return progressService.loadLocalProgress(bookId, scopeType)
  }, [])

  /**
   * 加载本地统计数据
   */
  const loadLocalStats = useCallback((bookId: string) => {
    return progressService.loadLocalStats(bookId)
  }, [])

  /**
   * 保存统计数据
   */
  const saveStats = useCallback((bookId: string, stats: StatsData) => {
    progressService.saveStats(bookId, stats)
  }, [])

  /**
   * 获取待处理任务数
   */
  const getPendingCount = useCallback(() => {
    return progressService.getPendingCount()
  }, [])

  /**
   * 页面卸载前处理
   */
  const onBeforeUnload = useCallback(async (data: ProgressData) => {
    currentProgressRef.current = data

    if (useSendBeacon) {
      await progressService.onBeforeUnload(data)
    }
  }, [useSendBeacon])

  /**
   * 组件卸载时自动保存
   */
  useEffect(() => {
    if (!saveOnUnmount) return

    return () => {
      // 组件卸载时，如果有当前进度数据，使用sendBeacon保存
      if (currentProgressRef.current && useSendBeacon) {
        progressService.onBeforeUnload(currentProgressRef.current)
      }
    }
  }, [saveOnUnmount, useSendBeacon])

  /**
   * 注册页面卸载事件监听器
   */
  useEffect(() => {
    if (!useSendBeacon || !currentProgressRef.current) return

    const handleBeforeUnload = () => {
      if (currentProgressRef.current) {
        // 同步调用sendBeacon（在beforeunload事件中必须同步）
        const data = currentProgressRef.current
        const endpoint = '/api/user-preferences'
        const payload = {
          bookId: data.bookId,
          preference: {
            last_resume_state: {
              mode: 'dictation',
              bookId: data.bookId,
              updatedAt: Date.now(),
              context: {
                scopeType: data.scopeType,
                currentIndex: data.currentIndex,
                totalWords: data.totalWords,
                currentWord: data.currentWord
              }
            }
          }
        }

        try {
          const blob = new Blob([JSON.stringify(payload)], {
            type: 'application/json'
          })
          navigator.sendBeacon(endpoint, blob)
        } catch (error) {
          console.warn('[useProgressService] sendBeacon failed:', error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [useSendBeacon])

  return {
    updateDictationProgress,
    updateWordStatus,
    loadLocalProgress,
    loadLocalStats,
    saveStats,
    getPendingCount,
    onBeforeUnload
  }
}

/**
 * 便捷Hook：用于听写模式的进度管理
 *
 * 自动处理听写模式的进度保存和恢复
 */
export function useDictationProgressService(bookId: string) {
  const progressService = useProgressService({
    saveOnUnmount: true,
    useSendBeacon: true
  })

  /**
   * 保存听写进度
   */
  const saveProgress = useCallback(
    async (scopeType: 'all' | 'unknown' | 'fuzzy' | 'known' | 'new', currentIndex: number, totalWords: number, currentWord?: { id: string; word: string }) => {
      console.log('[useDictationProgressService] saveProgress called:', { bookId, scopeType, currentIndex, totalWords, currentWord })
      await progressService.updateDictationProgress({
        bookId,
        scopeType,
        currentIndex,
        totalWords,
        currentWord
      })
    },
    [bookId, progressService]
  )

  /**
   * 恢复听写进度
   */
  const resumeProgress = useCallback(
    (scopeType: string) => {
      return progressService.loadLocalProgress(bookId, scopeType)
    },
    [bookId, progressService]
  )

  /**
   * 更新单词学习状态
   */
  const markWord = useCallback(
    async (wordId: string, oldStatus: string, newStatus: 'known' | 'unknown' | 'fuzzy') => {
      await progressService.updateWordStatus(wordId, bookId, oldStatus, newStatus)
    },
    [bookId, progressService]
  )

  return {
    saveProgress,
    resumeProgress,
    markWord,
    loadLocalStats: progressService.loadLocalStats,
    saveStats: progressService.saveStats,
    getPendingCount: progressService.getPendingCount
  }
}
