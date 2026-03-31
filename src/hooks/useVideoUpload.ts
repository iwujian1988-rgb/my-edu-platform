'use client'

/**
 * 视频上传 Hook
 *
 * 使用 STS Token 前端直传 OSS，支持进度回调
 * 复用现有 OSS Token 机制
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md Section 5.1
 * - "上传视频文件到 OSS"
 * - 视频文件：MP4 格式，建议 < 100MB
 */

import { useState, useCallback } from 'react'
import OSS from 'ali-oss'
import { getCacheHeaders } from '@/lib/oss'

interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
  videoUrl: string | null
  duration: number | null
}

interface UseVideoUploadReturn {
  uploadState: UploadState
  uploadVideo: (file: File) => Promise<{ url: string; duration: number } | null>
  resetState: () => void
}

// 上传配置常量
const VIDEO_CONFIG = {
  MAX_SIZE: 100 * 1024 * 1024, // 100MB（PRD 要求）
  ALLOWED_TYPES: ['video/mp4', 'video/webm', 'video/quicktime'] as const,
  OSS_PATH: 'videos/',
  TIMEOUT: 300000, // 5分钟超时（网络不稳定时需要更长）
  CHUNK_SIZE: 1024 * 1024, // 1MB 分片
  RETRY_COUNT: 3, // 重试次数
  RETRY_DELAY: 2000, // 重试延迟 2秒
}

// 错误消息
const ERROR_MESSAGES = {
  INVALID_TYPE: '只支持 MP4、WebM、MOV 格式的视频',
  FILE_TOO_LARGE: '视频过大，最大支持 100MB',
  TOKEN_FAILED: '获取上传凭证失败',
  UPLOAD_FAILED: '上传失败，请重试',
  DURATION_FAILED: '无法获取视频时长'
} as const

/**
 * 获取视频时长（秒）
 */
const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const duration = Math.round(video.duration)
      URL.revokeObjectURL(video.src)
      if (duration > 0) {
        resolve(duration)
      } else {
        reject(new Error(ERROR_MESSAGES.DURATION_FAILED))
      }
    }
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error(ERROR_MESSAGES.DURATION_FAILED))
    }
    video.src = URL.createObjectURL(file)
  })
}

/**
 * 视频上传 Hook
 */
export function useVideoUpload(): UseVideoUploadReturn {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    videoUrl: null,
    duration: null
  })

  /**
   * 验证文件
   */
  const validateFile = (file: File): string | null => {
    const allowedTypes: readonly string[] = VIDEO_CONFIG.ALLOWED_TYPES
    if (!allowedTypes.includes(file.type as any)) {
      return ERROR_MESSAGES.INVALID_TYPE
    }
    if (file.size > VIDEO_CONFIG.MAX_SIZE) {
      return ERROR_MESSAGES.FILE_TOO_LARGE
    }
    return null
  }

  /**
   * 带重试的上传函数
   */
  const uploadWithRetry = async (
    client: OSS,
    filename: string,
    file: File,
    retryCount: number = VIDEO_CONFIG.RETRY_COUNT
  ): Promise<any> => {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        console.log(`[视频上传] 尝试第 ${attempt}/${retryCount} 次`)

        if (file.size > 10 * 1024 * 1024) {
          // 大于 10MB 使用分片上传
          console.log('[视频上传] 使用分片上传模式')
          return await client.multipartUpload(filename, file, {
            chunkSize: VIDEO_CONFIG.CHUNK_SIZE,
            timeout: VIDEO_CONFIG.TIMEOUT,
            headers: getCacheHeaders('video'),
            progress: (p: number) => {
              const percent = Math.round(p * 100)
              setUploadState(prev => ({ ...prev, progress: percent }))
              console.log(`[视频上传] 进度: ${percent}%`)
            }
          })
        } else {
          // 小文件直接上传
          return await client.put(filename, file, {
            timeout: VIDEO_CONFIG.TIMEOUT,
            headers: getCacheHeaders('video'),
            progress: (p: number) => {
              const percent = Math.round(p * 100)
              setUploadState(prev => ({ ...prev, progress: percent }))
              console.log(`[视频上传] 进度: ${percent}%`)
            }
          })
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.error(`[视频上传] 第 ${attempt} 次失败:`, lastError.message)

        if (attempt < retryCount) {
          console.log(`[视频上传] ${VIDEO_CONFIG.RETRY_DELAY / 1000} 秒后重试...`)
          await new Promise(resolve => setTimeout(resolve, VIDEO_CONFIG.RETRY_DELAY))
        }
      }
    }

    throw lastError || new Error('上传失败')
  }

  /**
   * 上传视频到 OSS
   */
  const uploadVideo = useCallback(async (file: File): Promise<{ url: string; duration: number } | null> => {
    // 1. 验证文件
    const validationError = validateFile(file)
    if (validationError) {
      setUploadState(prev => ({ ...prev, error: validationError }))
      return null
    }

    // 2. 初始化上传状态
    setUploadState({
      isUploading: true,
      progress: 0,
      error: null,
      videoUrl: null,
      duration: null
    })

    try {
      // 3. 获取视频时长（在上传同时进行）
      const durationPromise = getVideoDuration(file)

      // 4. 获取 STS Token
      console.log('[视频上传] 正在获取 STS Token...')
      const tokenRes = await fetch('/api/admin/speaker/oss-token', {
        method: 'POST'
      })

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json()
        throw new Error(errorData.error || ERROR_MESSAGES.TOKEN_FAILED)
      }

      const tokenData = await tokenRes.json()
      console.log('[视频上传] STS Token 获取成功')

      // 5. 初始化 OSS 客户端
      const client = new OSS({
        region: tokenData.region,
        accessKeyId: tokenData.accessKeyId,
        accessKeySecret: tokenData.accessKeySecret,
        stsToken: tokenData.stsToken,
        bucket: tokenData.bucket,
        secure: true,
        timeout: VIDEO_CONFIG.TIMEOUT,
      })

      // 6. 生成唯一文件名
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const extension = file.name.split('.').pop() || 'mp4'
      const filename = `${VIDEO_CONFIG.OSS_PATH}${timestamp}-${randomStr}.${extension}`

      console.log(`[视频上传] 开始上传: ${filename} (${(file.size / 1024 / 1024).toFixed(1)} MB)`)

      // 7. 上传文件（带重试）
      const uploadPromise = uploadWithRetry(client, filename, file)

      // 8. 并行等待上传和时长获取
      const [uploadResult, duration] = await Promise.all([uploadPromise, durationPromise])

      // 9. 使用 SDK 返回的 URL（与 Speaker 上传保持一致）
      const publicUrl = uploadResult.url

      console.log(`[视频上传] 上传成功: ${publicUrl}, 时长: ${duration}秒`)

      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        videoUrl: publicUrl,
        duration
      })

      return { url: publicUrl, duration }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UPLOAD_FAILED
      console.error('[视频上传] 失败:', errorMessage)

      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage
      }))

      return null
    }
  }, [])

  /**
   * 重置上传状态
   */
  const resetState = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      videoUrl: null,
      duration: null
    })
  }, [])

  return {
    uploadState,
    uploadVideo,
    resetState
  }
}
