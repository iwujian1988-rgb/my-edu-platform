'use client'

/**
 * 图片上传 Hook
 *
 * 使用 STS Token 前端直传 OSS，支持进度回调
 * 复用音频上传的 Token 机制，保持体验一致
 */

import { useState, useCallback } from 'react'
import OSS from 'ali-oss'
import { getCacheHeaders } from '@/lib/oss'

interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
  imageUrl: string | null
}

interface UseImageUploadReturn {
  uploadState: UploadState
  uploadImage: (file: File) => Promise<string | null>
  resetState: () => void
}

// 上传配置常量
const IMAGE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
  OSS_PATH: 'speaker-covers/'
}

// 错误消息
const ERROR_MESSAGES = {
  INVALID_TYPE: '只支持 JPG、PNG、WebP、GIF 格式的图片',
  FILE_TOO_LARGE: '图片过大，最大支持 5MB',
  TOKEN_FAILED: '获取上传凭证失败',
  UPLOAD_FAILED: '上传失败，请重试'
} as const

/**
 * 图片上传 Hook
 */
export function useImageUpload(): UseImageUploadReturn {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    imageUrl: null
  })

  /**
   * 验证文件
   */
  const validateFile = (file: File): string | null => {
    const allowedTypes: readonly string[] = IMAGE_CONFIG.ALLOWED_TYPES
    if (!allowedTypes.includes(file.type)) {
      return ERROR_MESSAGES.INVALID_TYPE
    }
    if (file.size > IMAGE_CONFIG.MAX_SIZE) {
      return ERROR_MESSAGES.FILE_TOO_LARGE
    }
    return null
  }

  /**
   * 上传图片到 OSS
   */
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
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
      imageUrl: null
    })

    try {
      // 3. 获取 STS Token
      console.log('[图片上传] 正在获取 STS Token...')
      const tokenRes = await fetch('/api/admin/speaker/oss-token', {
        method: 'POST'
      })

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json()
        throw new Error(errorData.error || ERROR_MESSAGES.TOKEN_FAILED)
      }

      const tokenData = await tokenRes.json()
      console.log('[图片上传] STS Token 获取成功')

      // 4. 初始化 OSS 客户端
      const client = new OSS({
        region: tokenData.region,
        accessKeyId: tokenData.accessKeyId,
        accessKeySecret: tokenData.accessKeySecret,
        stsToken: tokenData.stsToken,
        bucket: tokenData.bucket,
        secure: true
      })

      // 5. 生成唯一文件名
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const extension = file.name.split('.').pop() || 'jpg'
      const filename = `${IMAGE_CONFIG.OSS_PATH}${timestamp}-${randomStr}.${extension}`

      console.log(`[图片上传] 开始上传: ${filename} (${(file.size / 1024).toFixed(1)} KB)`)

      // 6. 上传文件（带进度回调）
      const result = await client.put(filename, file, {
        headers: getCacheHeaders('image'),
        progress: (p: number) => {
          const percent = Math.round(p * 100)
          setUploadState(prev => ({ ...prev, progress: percent }))
          console.log(`[图片上传] 进度: ${percent}%`)
        }
      })

      // 7. 构建公开访问 URL
      const publicUrl = `https://${client.options.bucket}.${client.options.region}.aliyuncs.com/${filename}`

      console.log(`[图片上传] 上传成功: ${publicUrl}`)

      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        imageUrl: publicUrl
      })

      return publicUrl
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UPLOAD_FAILED
      console.error('[图片上传] 失败:', errorMessage)

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
      imageUrl: null
    })
  }, [])

  return {
    uploadState,
    uploadImage,
    resetState
  }
}
