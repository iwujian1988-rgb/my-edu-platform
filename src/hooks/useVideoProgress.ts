'use client'

/**
 * 视频进度管理 Hook
 *
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { UserVideoProgress } from '@/types/video'

interface UseVideoProgressOptions {
  videoId: string
  initialProgress?: UserVideoProgress | null
  onSave?: (progress: Partial<UserVideoProgress>) => Promise<void>
  saveInterval?: number // 自动保存间隔（毫秒）
}

interface UseVideoProgressResult {
  progress: UserVideoProgress | null
  currentTime: number
  maxProgress: number
  isCompleted: boolean
  isSaving: boolean
  updateProgress: (currentTime: number, duration: number) => void
  markCompleted: () => void
  saveProgress: () => Promise<void>
}

export function useVideoProgress({
  videoId,
  initialProgress,
  onSave,
  saveInterval = 5000, // 默认 5 秒自动保存
}: UseVideoProgressOptions): UseVideoProgressResult {
  const [progress, setProgress] = useState<UserVideoProgress | null>(
    initialProgress || null
  )
  const [currentTime, setCurrentTime] = useState(
    initialProgress?.last_position || 0
  )
  const [isSaving, setIsSaving] = useState(false)

  // 追踪最大进度
  const maxProgressRef = useRef(initialProgress?.max_progress || 0)
  const watchDurationRef = useRef(0)
  const lastSaveTimeRef = useRef(Date.now())
  const pendingSaveRef = useRef<NodeJS.Timeout | null>(null)

  // 清理定时器
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current)
      }
    }
  }, [])

  // 更新进度
  const updateProgress = useCallback(
    (time: number, duration: number) => {
      setCurrentTime(time)

      // 计算进度百分比
      const progressPercent = duration > 0 ? (time / duration) * 100 : 0

      // 更新最大进度
      if (progressPercent > maxProgressRef.current) {
        maxProgressRef.current = progressPercent
      }

      // 累计观看时长
      watchDurationRef.current += 1

      // 检查是否需要自动保存
      const now = Date.now()
      if (now - lastSaveTimeRef.current >= saveInterval) {
        saveProgress()
      }
    },
    [saveInterval]
  )

  // 保存进度
  const saveProgress = useCallback(async () => {
    if (!onSave || isSaving) return

    setIsSaving(true)
    lastSaveTimeRef.current = Date.now()

    try {
      await onSave({
        last_position: currentTime,
        max_progress: maxProgressRef.current,
        watch_duration_increment: Math.floor(watchDurationRef.current),
      })

      // 重置累计时长
      watchDurationRef.current = 0
    } catch (error) {
      console.error('[useVideoProgress] Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }, [currentTime, isSaving, onSave])

  // 标记完成
  const markCompleted = useCallback(async () => {
    setProgress((prev) =>
      prev
        ? {
            ...prev,
            is_completed: true,
            completed_at: new Date().toISOString(),
            max_progress: 100,
          }
        : null
    )

    maxProgressRef.current = 100

    if (onSave) {
      await onSave({
        is_completed: true,
        max_progress: 100,
      })
    }
  }, [onSave])

  // 页面离开时保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (watchDurationRef.current > 0) {
        // 使用 sendBeacon 确保请求被发送
        const data = JSON.stringify({
          last_position: currentTime,
          max_progress: maxProgressRef.current,
          watch_duration_increment: Math.floor(watchDurationRef.current),
        })

        navigator.sendBeacon(`/api/user/video-progress/${videoId}`, data)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [videoId, currentTime])

  return {
    progress,
    currentTime,
    maxProgress: maxProgressRef.current,
    isCompleted: progress?.is_completed || false,
    isSaving,
    updateProgress,
    markCompleted,
    saveProgress,
  }
}
