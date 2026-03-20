'use client'

/**
 * 录音功能 Hook
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 2.3
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { UserRecording } from '@/types/video'

interface UseRecordingsOptions {
  videoId: string
  onRecordingComplete?: (recording: UserRecording) => void
  maxDuration?: number // 最大录音时长（秒）
}

interface UseRecordingsResult {
  // 状态
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioURL: string | null
  error: string | null
  isUploading: boolean

  // 操作
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  cancelRecording: () => void
  uploadRecording: (subtitleId?: string) => Promise<UserRecording | null>
  playRecording: () => void
  clearRecording: () => void
}

export function useRecordings({
  videoId,
  onRecordingComplete,
  maxDuration = 60,
}: UseRecordingsOptions): UseRecordingsResult {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobRef = useRef<Blob | null>(null)

  // 清理
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup()
      if (audioURL) {
        URL.revokeObjectURL(audioURL)
      }
    }
  }, [cleanup, audioURL])

  // 开始录音
  const startRecording = useCallback(async () => {
    setError(null)

    try {
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      })

      streamRef.current = stream

      // 创建 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorderRef.current = mediaRecorder

      // 收集数据
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // 录音结束
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        blobRef.current = blob

        const url = URL.createObjectURL(blob)
        setAudioURL(url)

        cleanup()
      }

      // 开始录音
      mediaRecorder.start(100) // 每 100ms 收集一次数据
      setIsRecording(true)
      setIsPaused(false)
      setDuration(0)

      // 启动计时器
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration) {
            stopRecording()
            return prev
          }
          return prev + 0.1
        })
      }, 100)
    } catch (err) {
      console.error('[useRecordings] Start error:', err)
      setError('无法访问麦克风，请检查权限设置')
      cleanup()
    }
  }, [maxDuration, cleanup])

  // 停止录音
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecording) return

    mediaRecorderRef.current.stop()
    setIsRecording(false)
    setIsPaused(false)
  }, [isRecording])

  // 暂停录音
  const pauseRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return

    mediaRecorderRef.current.pause()
    setIsPaused(true)

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [isRecording])

  // 恢复录音
  const resumeRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isPaused) return

    mediaRecorderRef.current.resume()
    setIsPaused(false)

    timerRef.current = setInterval(() => {
      setDuration((prev) => {
        if (prev >= maxDuration) {
          stopRecording()
          return prev
        }
        return prev + 0.1
      })
    }, 100)
  }, [isPaused, maxDuration, stopRecording])

  // 取消录音
  const cancelRecording = useCallback(() => {
    cleanup()
    setIsRecording(false)
    setIsPaused(false)
    setDuration(0)

    if (audioURL) {
      URL.revokeObjectURL(audioURL)
      setAudioURL(null)
    }

    blobRef.current = null
  }, [cleanup, audioURL])

  // 上传录音
  const uploadRecording = useCallback(
    async (subtitleId?: string): Promise<UserRecording | null> => {
      if (!blobRef.current) {
        setError('没有可上传的录音')
        return null
      }

      setIsUploading(true)
      setError(null)

      try {
        const formData = new FormData()
        formData.append('video_id', videoId)
        formData.append('audio_file', blobRef.current, `recording_${Date.now()}.webm`)

        if (subtitleId) {
          formData.append('subtitle_id', subtitleId)
        }

        const res = await fetch('/api/recordings', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          throw new Error('上传失败')
        }

        const data = await res.json()
        const recording = data.data as UserRecording

        // 回调
        onRecordingComplete?.(recording)

        return recording
      } catch (err) {
        console.error('[useRecordings] Upload error:', err)
        setError('上传失败，请重试')
        return null
      } finally {
        setIsUploading(false)
      }
    },
    [videoId, onRecordingComplete]
  )

  // 播放录音
  const playRecording = useCallback(() => {
    if (!audioURL) return

    if (!audioRef.current) {
      audioRef.current = new Audio(audioURL)
    }

    audioRef.current.play()
  }, [audioURL])

  // 清除录音
  const clearRecording = useCallback(() => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL)
    }
    setAudioURL(null)
    blobRef.current = null
    setDuration(0)
    setError(null)
  }, [audioURL])

  return {
    isRecording,
    isPaused,
    duration,
    audioURL,
    error,
    isUploading,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    uploadRecording,
    playRecording,
    clearRecording,
  }
}
