'use client'

/**
 * 视频封面选择器组件
 *
 * 功能：
 * 1. 从视频 URL 提取多帧画面
 * 2. 以网格形式展示供管理员选择
 * 3. 选中后上传到 OSS 并返回 URL
 */

import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Loader2,
  Image as ImageIcon,
  Check,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { uploadThumbnail } from '@/app/api/admin/upload-thumbnail/action'

interface ThumbnailSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoUrl: string
  videoDuration: number // 视频时长（秒）
  videoId: string
  onSelect: (thumbnailUrl: string) => void
}

interface FrameInfo {
  dataUrl: string
  time: number
}

const FRAME_COUNT = 12 // 提取帧数

export function ThumbnailSelector({
  open,
  onOpenChange,
  videoUrl,
  videoDuration,
  videoId,
  onSelect,
}: ThumbnailSelectorProps) {
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
      console.error('[ThumbnailSelector] 提取帧失败:', err)
    } finally {
      setLoading(false)
    }
  }, [videoUrl])

  // 对话框打开时提取帧
  useEffect(() => {
    if (open && videoUrl) {
      extractFrames()
    }
    // 对话框关闭时清理
    if (!open) {
      setFrames([])
      setSelectedFrame(null)
      setError(null)
    }
  }, [open, videoUrl, extractFrames])

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

      console.log('[ThumbnailSelector] 开始上传封面...')

      // 调用 Server Action 上传
      const result = await uploadThumbnail({
        fileName,
        imageData,
      })

      if (!result.success || !result.url) {
        throw new Error(result.error || '上传失败')
      }

      console.log('[ThumbnailSelector] 上传成功, URL:', result.url)

      // 返回 URL
      onSelect(result.url)
      onOpenChange(false)

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '上传失败'
      setError(errorMsg)
      console.error('[ThumbnailSelector] 上传失败:', err)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            选择视频封面
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 加载状态 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">正在从视频中提取画面...</p>
              <p className="text-xs mt-1">这可能需要几秒钟</p>
            </div>
          )}

          {/* 帧网格 */}
          {!loading && frames.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {frames.map((frame, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedFrame(index)}
                  className={cn(
                    "relative aspect-video rounded overflow-hidden border-[2px] transition-all",
                    "hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]",
                    selectedFrame === index
                      ? "border-[#B4F416] shadow-[3px_3px_0px_0px_#000] ring-2 ring-[#B4F416]"
                      : "border-gray-200 dark:border-gray-700"
                  )}
                >
                  <img
                    src={frame.dataUrl}
                    alt={`Frame at ${formatTime(frame.time)}`}
                    className="w-full h-full object-cover"
                  />
                  {/* 时间标签 */}
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-xs font-mono rounded">
                    {formatTime(frame.time)}
                  </div>
                  {/* 选中标记 */}
                  {selectedFrame === index && (
                    <div className="absolute top-1 right-1 w-6 h-6 bg-[#B4F416] rounded-full flex items-center justify-center border-2 border-black">
                      <Check className="w-4 h-4 text-black" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* 无帧提示 */}
          {!loading && !error && frames.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">点击"重新提取"按钮从视频获取画面</p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          <Button
            variant="outline"
            onClick={extractFrames}
            disabled={loading || uploading}
            className="border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            重新提取
          </Button>

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
            className="border-[2px] border-black shadow-[2px_2px_0px_0px_#000]"
          >
            取消
          </Button>

          <Button
            onClick={handleUpload}
            disabled={selectedFrame === null || uploading || loading}
            className="bg-[#B4F416] text-black border-[2px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all font-bold"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                确认选择
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
