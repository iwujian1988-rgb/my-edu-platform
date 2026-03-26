'use client'

/**
 * 视频进度管理 Hook
 *
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0
 *
 * 修复版本：
 * - 使用 ref 存储需要保存的值，避免循环依赖
 * - 修复 sendBeacon 的 Content-Type 问题
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

  // 使用 ref 存储需要保存的值，避免循环依赖
  const currentTimeRef = useRef(initialProgress?.last_position || 0)
  const maxProgressRef = useRef(initialProgress?.max_progress || 0)
  const watchDurationRef = useRef(0)
  const lastSaveTimeRef = useRef(Date.now())
  const isSavingRef = useRef(false)
  const onSaveRef = useRef(onSave)

  // 保持 onSaveRef 最新
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  // 保存进度 - 使用 ref 避免依赖 state
  const saveProgress = useCallback(async () => {
    if (!onSaveRef.current || isSavingRef.current) return

    isSavingRef.current = true
    setIsSaving(true)
    lastSaveTimeRef.current = Date.now()

    try {
      await onSaveRef.current({
        last_position: currentTimeRef.current,
        max_progress: maxProgressRef.current,
        watch_duration_increment: Math.floor(watchDurationRef.current),
      })

      // 重置累计时长
      watchDurationRef.current = 0
    } catch (error) {
      console.error('[useVideoProgress] Save error:', error)
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }, []) // 无依赖，使用 ref 获取最新值

  // 更新进度
  const updateProgress = useCallback(
    (time: number, duration: number) => {
      setCurrentTime(time)
      currentTimeRef.current = time

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
    [saveInterval, saveProgress]
  )

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

    if (onSaveRef.current) {
      await onSaveRef.current({
        is_completed: true,
        max_progress: 100,
      })
    }
  }, [])

  // 页面离开时保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (watchDurationRef.current > 0 || maxProgressRef.current > 0) {
        // 使用 sendBeacon 确保请求被发送
        const data = JSON.stringify({
          last_position: currentTimeRef.current,
          max_progress: maxProgressRef.current,
          watch_duration_increment: Math.floor(watchDurationRef.current),
        })

        // 使用 Blob 设置正确的 Content-Type
        const blob = new Blob([data], { type: 'application/json' })
        navigator.sendBeacon(`/api/user/video-progress/${videoId}`, blob)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [videoId])

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
