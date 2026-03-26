'use client'

/**
 * 内嵌式视频封面选择器组件
 *
 * 功能：
 * 1. 从视频 URL 提取多帧画面
 * 2. 以网格形式展示供管理员选择
 * 3. 选中后上传到 OSS 并返回 URL
 * 4. 内嵌在页面中，不使用弹层
 */

import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Image as ImageIcon,
  Check,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react'
import { uploadThumbnail } from '@/app/api/admin/upload-thumbnail/action'

interface InlineThumbnailSelectorProps {
  videoUrl: string
  videoDuration: number // 视频时长（秒）
  videoId: string
  onSelect: (thumbnailUrl: string) => void
  onCancel: () => void
}

interface FrameInfo {
  dataUrl: string
  time: number
}

const FRAME_COUNT = 12 // 提取帧数

export function InlineThumbnailSelector({
  videoUrl,
  videoDuration,
  videoId,
  onSelect,
  onCancel,
}: InlineThumbnailSelectorProps) {
  const [frames, setFrames] = useState<FrameInfo[]>([])
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 提取视频帧（服务端方案，绕过 CORS）
  const extractFrames = useCallback(async () => {
    if (!videoUrl) {
      setError('视频 URL 为空')
      return
    }

    setLoading(true)
    setError(null)
    setFrames([])
    setSelectedFrame(null)

    try {
      // 调用服务端 API 提取帧（使用 ffmpeg，绕过浏览器 CORS 限制）
      const response = await fetch('/api/admin/extract-video-frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          frameCount: FRAME_COUNT,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '提取帧失败')
      }

      // data.frames 格式: { dataUrl: string, time: number }[]
      if (!data.frames || data.frames.length === 0) {
        throw new Error('未能提取到任何画面，请重试')
      }

      setFrames(data.frames)

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '提取帧失败'
      setError(errorMsg)
      console.error('[InlineThumbnailSelector] 提取帧失败:', err)
    } finally {
      setLoading(false)
    }
  }, [videoUrl])

  // 组件挂载时提取帧
  useEffect(() => {
    if (videoUrl) {
      extractFrames()
    }
    return () => {
      // 组件卸载时清理
      setFrames([])
      setSelectedFrame(null)
      setError(null)
    }
  }, [videoUrl, extractFrames])

  // 上传选中的帧
  const handleUpload = async () => {
    if (selectedFrame === null || !frames[selectedFrame]) return

    setUploading(true)
    setError(null)

    try {
      const frame = frames[selectedFrame]

      // 从 dataUrl 提取 base64 数据（去掉 data:image/jpeg;base64, 前缀）
      const base64Match = frame.dataUrl.match(/^data:image\/\w+;base64,(.+)$/)
      if (!base64Match) {
        throw new Error('图片数据格式无效')
      }
      const imageData = base64Match[1]

      // 生成文件名
      const timestamp = Date.now()
      const fileName = `${videoId}_thumb_${timestamp}.jpg`

      console.log('[InlineThumbnailSelector] 开始上传封面...')

      // 调用 Server Action 上传
      const result = await uploadThumbnail({
        fileName,
        imageData,
      })

      if (!result.success || !result.url) {
        throw new Error(result.error || '上传失败')
      }

      console.log('[InlineThumbnailSelector] 上传成功, URL:', result.url)

      // 返回 URL
      onSelect(result.url)

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '上传失败'
      setError(errorMsg)
      console.error('[InlineThumbnailSelector] 上传失败:', err)
    } finally {
      setUploading(false)
    }
  }

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-3">
      {/* 夎部标题 */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          选择视频封面
        </h4>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <p className="text-xs">正在从视频中提取画面...</p>
        </div>
      )}

      {/* 匧网格 */}
      {!loading && frames.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
          {frames.map((frame, index) => (
            <button
              key={index}
              onClick={() => setSelectedFrame(index)}
              className={cn(
                "relative aspect-video rounded overflow-hidden border-2 transition-all",
                "hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]",
                selectedFrame === index
                  ? "border-[#B4F416] shadow-[2px_2px_0px_0px_#000] ring-1 ring-[#B4F416]"
                  : "border-gray-200 dark:border-gray-600"
              )}
            >
              <img
                src={frame.dataUrl}
                alt={`Frame at ${formatTime(frame.time)}`}
                className="w-full h-full object-cover"
              />
              {/* 时间标签 */}
              <div className="absolute bottom-0.5 left-0.5 px-1 py-0.5 bg-black/70 text-white text-[10px] font-mono rounded">
                {formatTime(frame.time)}
              </div>
              {/* 选中标记 */}
              {selectedFrame === index && (
                <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-[#B4F416] rounded-full flex items-center justify-center border border-black">
                  <Check className="w-3 h-3 text-black" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 无帧提示 */}
      {!loading && !error && frames.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-xs">正在准备...</p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button
          variant="outline"
          size="sm"
          onClick={extractFrames}
          disabled={loading || uploading}
          className="border border-black shadow-[1px_1px_0px_0px_#000] hover:shadow-[0.5px_0.5px_0px_0px_#000] text-xs"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          重新提取
        </Button>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={uploading}
            className="border border-gray-300 text-xs"
          >
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={selectedFrame === null || uploading || loading}
            className="bg-[#B4F416] text-black border border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] text-xs font-bold"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Check className="w-3 h-3" />
                确认选择
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
