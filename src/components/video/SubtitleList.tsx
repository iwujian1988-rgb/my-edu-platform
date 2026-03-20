'use client'

/**
 * 字幕列表组件
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 2.2
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0
 *
 * 功能：
 * - 字幕同步展示
 * - 高亮词汇点击
 * - 字幕导出（TXT/SRT/JSON）
 */

import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Download, FileText, FileJson, Subtitles } from 'lucide-react'
import { SubtitleWithHighlights } from './SubtitleWithHighlights'
import type { VideoSubtitle, SubtitleWithHighlights as SubtitleWithHighlightsType, CardType } from '@/types/video'

// 导出格式类型
type ExportFormat = 'txt' | 'srt' | 'json'

// 导出格式配置
const EXPORT_FORMATS: { value: ExportFormat; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'txt', label: 'TXT', icon: FileText, description: '纯文本格式，每行一条字幕' },
  { value: 'srt', label: 'SRT', icon: Subtitles, description: '标准字幕格式，可用于视频编辑软件' },
  { value: 'json', label: 'JSON', icon: FileJson, description: '结构化数据，适合开发者使用' },
]

interface SubtitleListProps {
  subtitles: SubtitleWithHighlightsType[]
  currentVideoTime: number
  onSubtitleClick: (subtitle: VideoSubtitle) => void
  onHighlightClick: (cardType: CardType, cardId: string) => void
  displayMode: 'bilingual' | 'original' | 'chinese'
  autoScroll?: boolean
  className?: string
  videoTitle?: string
}

// 自动滚动阈值（像素）
const AUTO_SCROLL_THRESHOLD_PX = 100

export function SubtitleList({
  subtitles,
  currentVideoTime,
  onSubtitleClick,
  onHighlightClick,
  displayMode,
  autoScroll = true,
  className,
  videoTitle = 'video',
}: SubtitleListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeSubtitleRef = useRef<HTMLDivElement>(null)

  // 导出弹窗状态
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('txt')

  // 找到当前激活的字幕
  const activeSubtitleId = useMemo(() => {
    for (const subtitle of subtitles) {
      if (
        currentVideoTime >= subtitle.start_time &&
        currentVideoTime < subtitle.end_time
      ) {
        return subtitle.id
      }
    }
    return null
  }, [subtitles, currentVideoTime])

  // 自动滚动到当前字幕
  useEffect(() => {
    if (!autoScroll || !activeSubtitleRef.current || !containerRef.current) return

    const container = containerRef.current
    const activeElement = activeSubtitleRef.current

    // 检查是否需要滚动
    const containerRect = container.getBoundingClientRect()
    const activeRect = activeElement.getBoundingClientRect()

    const isOutOfView =
      activeRect.top < containerRect.top + AUTO_SCROLL_THRESHOLD_PX ||
      activeRect.bottom > containerRect.bottom - AUTO_SCROLL_THRESHOLD_PX

    if (isOutOfView) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [activeSubtitleId, autoScroll])

  // 格式化时间为 SRT 格式 (00:00:00,000)
  const formatSrtTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }, [])

  // 生成导出内容
  const generateExportContent = useCallback((format: ExportFormat): string => {
    if (subtitles.length === 0) return ''

    switch (format) {
      case 'txt':
        return subtitles
          .map((sub) => {
            if (displayMode === 'chinese' && sub.chinese_text) {
              return sub.chinese_text
            }
            if (displayMode === 'bilingual' && sub.chinese_text) {
              return `${sub.original_text}\n${sub.chinese_text}`
            }
            return sub.original_text
          })
          .join('\n\n')

      case 'srt':
        return subtitles
          .map((sub, index) => {
            const startTime = formatSrtTime(sub.start_time)
            const endTime = formatSrtTime(sub.end_time)
            let text = sub.original_text
            if (displayMode === 'bilingual' && sub.chinese_text) {
              text = `${sub.original_text}\n${sub.chinese_text}`
            } else if (displayMode === 'chinese' && sub.chinese_text) {
              text = sub.chinese_text
            }
            return `${index + 1}\n${startTime} --> ${endTime}\n${text}`
          })
          .join('\n\n')

      case 'json':
        const jsonData = subtitles.map((sub) => ({
          id: sub.id,
          start_time: sub.start_time,
          end_time: sub.end_time,
          original_text: sub.original_text,
          chinese_text: sub.chinese_text,
        }))
        return JSON.stringify(jsonData, null, 2)

      default:
        return ''
    }
  }, [subtitles, displayMode, formatSrtTime])

  // 执行导出
  const handleExport = useCallback(() => {
    try {
      const content = generateExportContent(exportFormat)
      if (!content) return

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${videoTitle}_subtitles.${exportFormat}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setIsExportDialogOpen(false)
    } catch (error) {
      // 导出失败静默处理
    }
  }, [exportFormat, generateExportContent, videoTitle])

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'h-full overflow-y-auto',
        'scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent',
        className
      )}
    >
      {/* 控制栏 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm p-2 border-b flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExportDialogOpen(true)}
          disabled={subtitles.length === 0}
          className="text-muted-foreground hover:text-foreground"
        >
          <Download className="w-4 h-4 mr-1" />
          导出字幕
        </Button>
      </div>

      {/* 字幕列表 */}
      <div className="space-y-1 p-4">
        {subtitles.map((subtitle) => {
          const isActive = subtitle.id === activeSubtitleId

          return (
            <div
              key={subtitle.id}
              ref={isActive ? activeSubtitleRef : null}
              className={cn(
                'rounded-lg p-3 cursor-pointer transition-all duration-200',
                isActive
                  ? 'bg-primary/10 border-l-2 border-primary'
                  : 'hover:bg-muted/50'
              )}
              onClick={() => onSubtitleClick(subtitle)}
            >
              {/* 时间戳 */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    'text-xs font-mono',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {formatTime(subtitle.start_time)}
                </span>
              </div>

              {/* 字幕内容 */}
              <SubtitleWithHighlights
                subtitle={subtitle}
                isActive={isActive}
                onHighlightClick={onHighlightClick}
                displayMode={displayMode}
              />
            </div>
          )
        })}

        {subtitles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            暂无字幕
          </div>
        )}
      </div>

      {/* 导出弹窗 */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>导出字幕</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              选择导出格式，当前显示模式： {displayMode === 'bilingual' ? '双语' : displayMode === 'chinese' ? '中文' : '原文'}
            </p>

            <div className="grid grid-cols-3 gap-2">
              {EXPORT_FORMATS.map((format) => {
                const IconComponent = format.icon
                return (
                  <button
                    key={format.value}
                    onClick={() => setExportFormat(format.value)}
                    className={cn(
                      'flex flex-col items-center p-3 rounded-lg border transition-all',
                      exportFormat === format.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <IconComponent className="w-6 h-6 mb-2" />
                    <span className="font-medium text-sm">{format.label}</span>
                    <span className="text-xs text-muted-foreground text-center mt-1">
                      {format.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
