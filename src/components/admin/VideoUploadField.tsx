'use client'

/**
 * 视频上传字段组件
 *
 * 用于管理后台上传视频文件到 OSS
 * 支持：拖拽上传、点击选择、手动输入 URL
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md Section 5.1
 */

import { useState, useRef, useCallback } from 'react'
import { Upload, Loader2, CheckCircle, AlertCircle, Link as LinkIcon, Video } from 'lucide-react'
import { useVideoUpload } from '@/hooks/useVideoUpload'
import { cn } from '@/lib/utils'

interface VideoUploadFieldProps {
  value: string
  onChange: (url: string, duration?: number) => void
  error?: string
  disabled?: boolean
}

export function VideoUploadField({
  value,
  onChange,
  error,
  disabled = false
}: VideoUploadFieldProps) {
  const { uploadState, uploadVideo, resetState } = useVideoUpload()
  const [isDragging, setIsDragging] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理文件选择
  const handleFileSelect = useCallback(async (file: File) => {
    const result = await uploadVideo(file)
    if (result) {
      onChange(result.url, result.duration)
    }
  }, [uploadVideo, onChange])

  // 拖拽事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !uploadState.isUploading) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled || uploadState.isUploading) return

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) {
      handleFileSelect(file)
    }
  }

  // 文件输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // 使用手动输入的 URL
  const handleUseManualUrl = () => {
    if (manualUrl.trim()) {
      onChange(manualUrl.trim())
      setShowManualInput(false)
      setManualUrl('')
    }
  }

  // 清除已上传的视频
  const handleClear = () => {
    onChange('')
    resetState()
  }

  const hasVideo = value && value.length > 0

  return (
    <div className="space-y-3">
      {/* 上传区域 */}
      <div
        className={cn(
          "relative border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 transition-all",
          isDragging && "border-green-500 bg-green-50 dark:bg-green-900/20",
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-red-500"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleInputChange}
          disabled={disabled || uploadState.isUploading}
          className="hidden"
        />

        {/* 上传中状态 */}
        {uploadState.isUploading ? (
          <div className="p-6 text-center">
            <Loader2 className="w-10 h-10 text-green-500 mx-auto mb-3 animate-spin" />
            <p className="text-sm font-bold text-black dark:text-white mb-3">
              正在上传视频...
            </p>
            {/* 进度条 */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 border-2 border-black dark:border-gray-500">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-mono">
              {uploadState.progress}%
            </p>
          </div>
        ) : hasVideo ? (
          /* 已上传状态 */
          <div className="p-4 flex items-center gap-4">
            <div className="w-16 h-12 bg-gray-100 dark:bg-gray-700 border-2 border-black dark:border-gray-500 flex items-center justify-center flex-shrink-0">
              <Video className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  视频已上传
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
                {value}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white border-2 border-black hover:bg-red-600 transition-colors"
            >
              清除
            </button>
          </div>
        ) : (
          /* 空状态 - 点击上传 */
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={cn(
              "w-full p-6 text-center cursor-pointer",
              disabled && "cursor-not-allowed"
            )}
          >
            <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-black dark:text-white mb-1">
              拖拽视频到此处，或<span className="text-green-500">点击选择</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              支持 MP4 / WebM / MOV，最大 100MB
            </p>
          </button>
        )}
      </div>

      {/* 上传错误 */}
      {uploadState.error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold">{uploadState.error}</span>
        </div>
      )}

      {/* 外部传入的错误 */}
      {error && !uploadState.error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* 手动输入 URL 切换 */}
      {!hasVideo && !uploadState.isUploading && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          >
            <LinkIcon className="w-3 h-3" />
            {showManualInput ? '隐藏手动输入' : '或手动输入视频 URL'}
          </button>

          {showManualInput && (
            <div className="flex gap-2">
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://example.com/video.mp4"
                className="flex-1 px-3 py-2 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleUseManualUrl}
                disabled={!manualUrl.trim()}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-[3px] border-black dark:border-gray-600 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                使用
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
