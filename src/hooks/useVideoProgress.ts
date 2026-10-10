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

interface VideoProgressSavePayload extends Partial<UserVideoProgress> {
  // 写入 API 接收增量，数据库读取记录则使用累计的 watch_duration。
  watch_duration_increment?: number
}

interface UseVideoProgressOptions {
  videoId: string
  initialProgress?: UserVideoProgress | null
  onSave?: (progress: VideoProgressSavePayload) => Promise<void>
  saveInterval?: number // 自动保存间隔（毫秒）
}

interface UseVideoProgressResult {
  progress: UserVideoProgress | null
  currentTime: number
  maxProgress: number
  isCompleted: boolean
  isSaving: boolean
  updateProgress: (currentTime: number, duration: number) => void
  markCompleted: () => Promise<void>
  saveProgress: (strict?: boolean) => Promise<void>
}

const COMPLETED_PROGRESS_PERCENT = 100

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
  const [isCompleted, setIsCompleted] = useState(initialProgress?.is_completed || false)
  const [maxProgress, setMaxProgress] = useState(initialProgress?.max_progress || 0)

  // 使用 ref 存储需要保存的值，避免循环依赖
  const currentTimeRef = useRef(initialProgress?.last_position || 0)
  const maxProgressRef = useRef(initialProgress?.max_progress || 0)
  const watchDurationRef = useRef(0)
  const lastSaveTimeRef = useRef(0)
  const pendingSaveRef = useRef<Promise<void> | null>(null)
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    lastSaveTimeRef.current = Date.now()
  }, [])

  // 保持 onSaveRef 最新
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  // 完成写入和进度写入必须按顺序确认，失败后仍允许用户重新提交。
  const enqueueSave = useCallback((operation: () => Promise<void>) => {
    setIsSaving(true)
    const previous = pendingSaveRef.current
    const queued = previous
      ? previous.then(operation, operation)
      : Promise.resolve().then(operation)
    const tracked = queued.finally(() => {
      if (pendingSaveRef.current === tracked) {
        pendingSaveRef.current = null
        setIsSaving(false)
      }
    })
    pendingSaveRef.current = tracked
    return tracked
  }, [])

  // 保存进度 - 使用 ref 避免依赖 state
  const saveProgress = useCallback(async (strict = false) => {
    if (!onSaveRef.current || (!strict && pendingSaveRef.current)) return

    try {
      await enqueueSave(async () => {
        const persist = onSaveRef.current
        if (!persist) return
        lastSaveTimeRef.current = Date.now()
        const savedWatchDuration = Math.floor(watchDurationRef.current)
        await persist({
          last_position: currentTimeRef.current,
          max_progress: maxProgressRef.current,
          watch_duration_increment: savedWatchDuration,
        })

        // 请求期间仍可能播放，只扣除本次确认写入的时长。
        watchDurationRef.current -= savedWatchDuration
      })
    } catch (error) {
      console.error('[useVideoProgress] Save error:', error)
      if (strict) throw error
    }
  }, [enqueueSave]) // 使用 ref 获取最新值

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
        setMaxProgress(progressPercent)
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
    if (!onSaveRef.current) return
    await enqueueSave(async () => {
      const persist = onSaveRef.current
      if (!persist) return
      await persist({
        is_completed: true,
        max_progress: COMPLETED_PROGRESS_PERCENT,
        // API 对缺失位置使用 0，完成学习不能清空断点。
        last_position: currentTimeRef.current,
      })
    })

    // 仅在服务端确认后更新；首次学习没有完整记录，也不能伪造用户或记录 ID。
    setIsCompleted(true)
    setProgress((prev) =>
      prev
        ? {
            ...prev,
            is_completed: true,
            completed_at: new Date().toISOString(),
            max_progress: COMPLETED_PROGRESS_PERCENT,
          }
        : null
    )

    maxProgressRef.current = COMPLETED_PROGRESS_PERCENT
    setMaxProgress(COMPLETED_PROGRESS_PERCENT)
  }, [enqueueSave])

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
    maxProgress,
    isCompleted,
    isSaving,
    updateProgress,
    markCompleted,
    saveProgress,
  }
}
