'use client'

/**
 * 图片上传弹层组件
 *
 * 功能：
 * 1. 支持拖拽或点击选择图片
 * 2. 图片预览
 * 3. OSS 上传（带进度条）
 * 4. 支持手动输入外部 URL
 * 5. 系统随机推荐图片（可在中国访问的源）
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Upload, Loader2, CheckCircle, AlertCircle, Link as LinkIcon, RefreshCw, Sparkles } from 'lucide-react'
import { useImageUpload } from '@/hooks/useImageUpload'

interface ImageUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (url: string) => void
  currentImageUrl?: string
  category?: string  // 文章分类，用于推荐相关图片
}

// 图片关键词映射（用于 Picsum Photos，稳定可靠）
// Picsum 不支持关键词搜索，但可以通过 seed 生成不同风格的图片
const CATEGORY_SEEDS: Record<string, string[]> = {
  '心理': ['mind', 'calm', 'peace', 'think', 'soul'],
  '健康': ['health', 'fit', 'yoga', 'well', 'body'],
  '成长': ['grow', 'rise', 'up', 'forward', 'achieve'],
  '学习': ['learn', 'read', 'book', 'study', 'know'],
  '社交': ['team', 'friend', 'meet', 'talk', 'group'],
  '生活': ['life', 'happy', 'daily', 'home', 'nature'],
  'default': ['any', 'random', 'pick', 'choice', 'default']
}

// 生成随机图片 URL（使用 Picsum Photos）
const getRandomImageUrl = (category: string): string => {
  const seeds = CATEGORY_SEEDS[category] || CATEGORY_SEEDS['default']
  const seed = seeds[Math.floor(Math.random() * seeds.length)]
  const random = Date.now() + Math.floor(Math.random() * 10000)
  // Picsum 格式: https://picsum.photos/seed/{seed}/400/250
  return `https://picsum.photos/seed/${seed}${random}/400/250`
}

export default function ImageUploadModal({
  isOpen,
  onClose,
  onConfirm,
  currentImageUrl,
  category = 'default'
}: ImageUploadModalProps) {
  const { uploadState, uploadImage, resetState } = useImageUpload()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 同步当前图片 URL 到预览
  useEffect(() => {
    if (currentImageUrl && !previewUrl) {
      setPreviewUrl(currentImageUrl)
    }
  }, [currentImageUrl, previewUrl])

  // 上传成功后自动更新预览
  useEffect(() => {
    if (uploadState.imageUrl) {
      setPreviewUrl(uploadState.imageUrl)
    }
  }, [uploadState.imageUrl])

  // 关闭弹层时重置状态
  const handleClose = useCallback(() => {
    resetState()
    setPreviewUrl(null)
    setManualUrl('')
    onClose()
  }, [resetState, onClose])

  // 选择文件
  const handleFileSelect = useCallback(async (file: File) => {
    // 生成本地预览
    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)

    // 上传到 OSS
    await uploadImage(file)
  }, [uploadImage])

  // 文件输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // 拖拽事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file)
    }
  }

  // 使用外部 URL
  const handleUseManualUrl = () => {
    if (manualUrl.trim()) {
      setPreviewUrl(manualUrl.trim())
    }
  }

  // 随机推荐图片
  const handleRandomRecommend = () => {
    const randomImage = getRandomImageUrl(category)
    setPreviewUrl(randomImage)
    setManualUrl('')
  }

  // 从 URL 下载图片并上传到 OSS
  const uploadFromUrl = async (url: string): Promise<string | null> => {
    try {
      // 1. 获取图片
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('获取图片失败')
      }

      // 2. 转换为 Blob
      const blob = await response.blob()

      // 3. 转换为 File
      const extension = blob.type.split('/')[1] || 'jpg'
      const file = new File([blob], `recommend-${Date.now()}.${extension}`, {
        type: blob.type
      })

      // 4. 上传到 OSS
      const ossUrl = await uploadImage(file)
      return ossUrl
    } catch (error) {
      console.error('[从URL上传失败]', error)
      return null
    }
  }

  // 确认使用当前图片
  const handleConfirm = async () => {
    // 如果已经上传到 OSS，直接使用
    if (uploadState.imageUrl) {
      onConfirm(uploadState.imageUrl)
      handleClose()
      return
    }

    // 如果有预览 URL
    if (previewUrl) {
      // 检查是否是 OSS URL
      if (previewUrl.includes('aliyuncs.com')) {
        onConfirm(previewUrl)
        handleClose()
        return
      }

      // 外部 URL，需要先上传到 OSS
      const ossUrl = await uploadFromUrl(previewUrl)
      if (ossUrl) {
        onConfirm(ossUrl)
        handleClose()
      } else {
        // 上传失败，但仍然使用原 URL（降级处理）
        alert('上传到 OSS 失败，将使用原图 URL')
        onConfirm(previewUrl)
        handleClose()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* 弹层内容 */}
      <div className="relative bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_#000] w-full max-w-lg mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black bg-purple-50">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Upload className="text-purple-600" size={20} />
            上传封面图片
          </h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-4 space-y-4">
          {/* 拖拽上传区域 */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />

            {uploadState.isUploading ? (
              <div className="space-y-3">
                <Loader2 className="animate-spin text-purple-600 mx-auto" size={32} />
                <p className="text-sm text-gray-600">正在上传...</p>
                {/* 进度条 */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{uploadState.progress}%</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="text-gray-400 mx-auto" size={32} />
                <p className="text-gray-600">
                  拖拽图片到此处，或<span className="text-purple-600">点击选择</span>
                </p>
                <p className="text-xs text-gray-400">支持 JPG / PNG / WebP / GIF，最大 5MB</p>
              </div>
            )}
          </div>

          {/* 错误提示 */}
          {uploadState.error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />
              {uploadState.error}
            </div>
          )}

          {/* 分隔线 */}
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400">或</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* 系统推荐 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Sparkles size={14} className="text-purple-500" />
              系统推荐图片
            </label>
            <button
              onClick={handleRandomRecommend}
              className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-300 rounded-lg text-sm hover:bg-purple-100 flex items-center justify-center gap-2 text-purple-700"
            >
              <RefreshCw size={16} />
              随机推荐一张「{category}」相关图片
            </button>
          </div>

          {/* 分隔线 */}
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400">或</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* 手动输入 URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <LinkIcon size={14} />
              外部图片 URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-2 border-2 border-black rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleUseManualUrl}
                disabled={!manualUrl.trim()}
                className="px-4 py-2 bg-gray-100 border-2 border-black rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                预览
              </button>
            </div>
          </div>

          {/* 图片预览 */}
          {previewUrl && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <CheckCircle size={14} className="text-green-600" />
                图片预览
              </label>
              <div className="relative w-full aspect-[8/5] bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                <img
                  src={previewUrl}
                  alt="预览"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"%3E%3Crect fill="%23f3f4f6" width="400" height="250"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E图片加载失败%3C/text%3E%3C/svg%3E'
                  }}
                />
                {uploadState.imageUrl && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded flex items-center gap-1">
                    <CheckCircle size={12} />
                    已上传
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!previewUrl || uploadState.isUploading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors border-2 border-purple-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploadState.isUploading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                上传中...
              </>
            ) : (
              '确认使用'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
