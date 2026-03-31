'use client'

/**
 * 录音功能 Hook
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 2.3
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0
 *
 * 使用 STS Token 前端直传 OSS（与 speaker 模块一致）
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import OSS from 'ali-oss'
import { getCacheHeaders } from '@/lib/oss'
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
  uploadProgress: number // 上传进度 0-100
  uploadStatus: string // 上传状态文本
  recordings: UserRecording[] // 历史录音列表
  pendingUploadSubtitleId: string | null // 正在上传的字幕 ID（用于后台静默上传）

  // 操作
  startRecording: (subtitleId: string) => Promise<void>
  stopRecording: () => Promise<void> // 返回 Promise，等待录音数据准备好
  pauseRecording: () => void
  resumeRecording: () => void
  cancelRecording: () => void
  uploadRecording: (subtitleId?: string) => Promise<UserRecording | null>
  uploadRecordingBackground: (subtitleId?: string) => void // 后台静默上传（不阻塞）
  playRecording: () => void
  clearRecording: () => void
  deleteRecording: (recordingId: string) => Promise<void>
  loadRecordings: () => Promise<void>
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
  const [uploadProgress, setUploadProgress] = useState(0) // 上传进度 0-100
  const [uploadStatus, setUploadStatus] = useState<string>('') // 上传状态文本
  const [recordings, setRecordings] = useState<UserRecording[]>([])
  const [pendingUploadSubtitleId, setPendingUploadSubtitleId] = useState<string | null>(null) // 正在上传的字幕 ID

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const currentSubtitleIdRef = useRef<string | null>(null)
  const stopResolveRef = useRef<(() => void) | null>(null) // 用于等待 stop 完成

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

  // 加载历史录音
  const loadRecordings = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/recordings?video_id=${videoId}`)
      if (res.ok) {
        const data = await res.json()
        setRecordings(data.data?.items || [])
      }
    } catch (err) {
      console.error('[useRecordings] Load error:', err)
    }
  }, [videoId])

  // 初始加载
  useEffect(() => {
    loadRecordings()
  }, [loadRecordings])

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
  const startRecording = useCallback(async (subtitleId: string) => {
    setError(null)
    currentSubtitleIdRef.current = subtitleId

    try {
      // 请求麦克风权限 - 使用优化的音频约束
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,   // 自动增益控制
          channelCount: 1,         // 强制单声道，防混音 Bug
          sampleRate: 48000,       // Opus 原生采样率
        },
      })

      streamRef.current = stream

      // 创建 MediaRecorder - 锁定高码率
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000,  // 128kbps 保证清晰度
      })

      mediaRecorderRef.current = mediaRecorder

      // 收集数据
      mediaRecorder.ondataavailable = (event) => {
        console.log(`[useRecordings] 📦 ondataavailable: ${event.data.size} bytes`)
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // 录音结束
      mediaRecorder.onstop = () => {
        const totalChunks = chunksRef.current.length
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        blobRef.current = blob

        console.log(`[useRecordings] 🏁 录音结束: ${totalChunks} chunks, ${(blob.size / 1024).toFixed(1)}KB`)

        const url = URL.createObjectURL(blob)
        setAudioURL(url)

        cleanup()

        // 通知 stopRecording 的 Promise 已完成
        if (stopResolveRef.current) {
          stopResolveRef.current()
          stopResolveRef.current = null
        }
      }

      // 开始录音 - 每 250ms 分片一次，防止底层编码器死锁导致的静音
      mediaRecorder.start(250)
      console.log('[useRecordings] 🎙️ 录音开始 (250ms 分片模式)')
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

  // 停止录音 - 返回 Promise 等待数据准备好
  const stopRecording = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve()
        return
      }

      // 保存 resolve 函数，在 onstop 回调中调用
      stopResolveRef.current = resolve

      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
    })
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
    currentSubtitleIdRef.current = null
  }, [cleanup, audioURL])

  // 上传录音（使用 STS Token 前端直传 OSS）
  const uploadRecording = useCallback(
    async (subtitleId?: string): Promise<UserRecording | null> => {
      if (!blobRef.current) {
        setError('没有可上传的录音')
        return null
      }

      const targetSubtitleId = subtitleId || currentSubtitleIdRef.current
      if (!targetSubtitleId) {
        setError('缺少字幕 ID')
        return null
      }

      setIsUploading(true)
      setError(null)

      try {
        // 1. 获取 STS Token（参考 useImageUpload.ts）
        console.log('[useRecordings] 获取 STS Token...')
        const tokenRes = await fetch('/api/user/recordings/oss-token', {
          method: 'POST'
        })

        if (!tokenRes.ok) {
          throw new Error('获取上传凭证失败')
        }

        const tokenData = await tokenRes.json()
        console.log('[useRecordings] STS Token 获取成功')

        // 2. 初始化 OSS 客户端
        const client = new OSS({
          region: tokenData.region,
          accessKeyId: tokenData.accessKeyId,
          accessKeySecret: tokenData.accessKeySecret,
          stsToken: tokenData.stsToken,
          bucket: tokenData.bucket,
          secure: true,
        })

        // 3. 生成文件路径
        const timestamp = Date.now()
        const objectKey = `audio/recordings/${videoId}/${targetSubtitleId}/${timestamp}.webm`

        // 4. 上传到 OSS（带进度回调）
        console.log(`[useRecordings] 上传到 OSS: ${objectKey}, 文件大小: ${(blobRef.current.size / 1024).toFixed(1)}KB`)
        setUploadProgress(0)

        await client.put(objectKey, blobRef.current, {
          headers: getCacheHeaders('recording'),
          progress: (p: number) => {
            const percent = Math.floor(p * 100)
            setUploadProgress(percent)
            console.log(`[useRecordings] 上传进度: ${percent}%`)
          }
        })

        // 5. 构建公开 URL
        const recordingUrl = `https://${tokenData.bucket}.${tokenData.region}.aliyuncs.com/${objectKey}`
        console.log('[useRecordings] OSS 上传成功:', recordingUrl)

        // 6. 保存元数据到数据库
        const saveRes = await fetch('/api/user/recordings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_id: videoId,
            subtitle_id: targetSubtitleId,
            recording_url: recordingUrl,
            file_size: blobRef.current.size,
            content_type: 'audio/webm',
            duration: duration,
          }),
        })

        if (!saveRes.ok) {
          throw new Error('保存录音元数据失败')
        }

        const saveData = await saveRes.json()
        const recording = saveData.data.recording as UserRecording

        // 7. 更新本地列表
        setRecordings(prev => [recording, ...prev])

        // 8. 回调
        onRecordingComplete?.(recording)

        console.log('[useRecordings] 录音保存成功')
        return recording
      } catch (err) {
        console.error('[useRecordings] Upload error:', err)
        setError('上传失败，请重试')
        return null
      } finally {
        setIsUploading(false)
      }
    },
    [videoId, duration, onRecordingComplete]
  )

  // 后台静默上传（不阻塞用户操作）
  const uploadRecordingBackground = useCallback(
    (subtitleId?: string) => {
      const targetSubtitleId = subtitleId || currentSubtitleIdRef.current
      if (!targetSubtitleId || !blobRef.current) {
        return
      }

      // 保存 blob 引用，防止组件卸载后丢失
      const blobToUpload = blobRef.current

      // 标记正在上传
      setPendingUploadSubtitleId(targetSubtitleId)
      setIsUploading(true)
      setUploadProgress(0)
      setUploadStatus('准备上传...')

      // 异步上传，不等待结果
      ;(async () => {
        try {
          // 1. 获取 STS Token
          setUploadStatus('获取凭证...')
          console.log('[useRecordings] 🔄 后台上传: 获取 STS Token...')
          const tokenRes = await fetch('/api/user/recordings/oss-token', {
            method: 'POST'
          })

          if (!tokenRes.ok) {
            throw new Error('获取上传凭证失败')
          }

          const tokenData = await tokenRes.json()

          // 2. 初始化 OSS 客户端
          const client = new OSS({
            region: tokenData.region,
            accessKeyId: tokenData.accessKeyId,
            accessKeySecret: tokenData.accessKeySecret,
            stsToken: tokenData.stsToken,
            bucket: tokenData.bucket,
            secure: true,
          })

          // 3. 生成文件路径
          const timestamp = Date.now()
          const objectKey = `audio/recordings/${videoId}/${targetSubtitleId}/${timestamp}.webm`
          const fileSizeKB = (blobToUpload.size / 1024).toFixed(1)

          // 4. 上传到 OSS
          setUploadStatus(`上传中 (${fileSizeKB}KB)...`)
          setUploadProgress(10) // 立即显示一点进度
          console.log(`[useRecordings] 🔄 后台上传: ${objectKey} (${fileSizeKB}KB)`)

          // 使用 multipartUpload 获得更可靠的进度回调
          await client.multipartUpload(objectKey, blobToUpload, {
            headers: getCacheHeaders('recording'),
            progress: (p: number) => {
              const percent = Math.floor(p * 100)
              setUploadProgress(percent)
              setUploadStatus(`上传中 ${percent}%`)
            }
          })

          // 5. 构建公开 URL
          const recordingUrl = `https://${tokenData.bucket}.${tokenData.region}.aliyuncs.com/${objectKey}`
          console.log('[useRecordings] ✅ 后台上传成功:', recordingUrl)

          // 6. 保存元数据到数据库
          setUploadStatus('保存记录...')
          const saveRes = await fetch('/api/user/recordings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              video_id: videoId,
              subtitle_id: targetSubtitleId,
              recording_url: recordingUrl,
              file_size: blobToUpload.size,
              content_type: 'audio/webm',
              duration: duration,
            }),
          })

          if (!saveRes.ok) {
            throw new Error('保存录音元数据失败')
          }

          const saveData = await saveRes.json()
          const recording = saveData.data.recording as UserRecording

          // 7. 更新本地列表
          setRecordings(prev => [recording, ...prev])

          // 8. 回调
          onRecordingComplete?.(recording)

          console.log('[useRecordings] ✅ 录音保存成功（后台）')
        } catch (err) {
          console.error('[useRecordings] ❌ 后台上传失败:', err)
          setError('上传失败，但录音已保存到本地')
        } finally {
          setIsUploading(false)
          setPendingUploadSubtitleId(null)
          setUploadProgress(0)
          setUploadStatus('')
        }
      })()
    },
    [videoId, duration, onRecordingComplete]
  )

  // 删除录音
  const deleteRecording = useCallback(async (recordingId: string) => {
    try {
      const res = await fetch(`/api/user/recordings/${recordingId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setRecordings(prev => prev.filter(r => r.id !== recordingId))
      }
    } catch (err) {
      console.error('[useRecordings] Delete error:', err)
    }
  }, [])

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
    currentSubtitleIdRef.current = null
  }, [audioURL])

  return {
    isRecording,
    isPaused,
    duration,
    audioURL,
    error,
    isUploading,
    uploadProgress,
    uploadStatus,
    recordings,
    pendingUploadSubtitleId,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    uploadRecording,
    uploadRecordingBackground,
    playRecording,
    clearRecording,
    deleteRecording,
    loadRecordings,
  }
}
