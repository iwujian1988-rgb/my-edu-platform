'use client'

/**
 * 字幕列表组件
 *
 * 功能：
 * - 字幕同步展示（当前播放高亮）
 * - 高亮词汇点击
 * - 自动滚动（外部控制）
 * - 字幕导出
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

type ExportFormat = 'txt' | 'srt' | 'json'

const EXPORT_FORMATS: { value: ExportFormat; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'txt', label: 'TXT', icon: FileText, description: '纯文本格式' },
  { value: 'srt', label: 'SRT', icon: Subtitles, description: '标准字幕格式' },
  { value: 'json', label: 'JSON', icon: FileJson, description: '结构化数据' },
]

interface SubtitleListProps {
  subtitles: SubtitleWithHighlightsType[]
  currentVideoTime: number
  onSubtitleClick: (subtitle: VideoSubtitle) => void
  onHighlightClick: (cardType: CardType, cardId: string, event: React.MouseEvent) => void
  displayMode: 'bilingual' | 'original' | 'chinese'
  autoScroll?: boolean // 外部控制自动滚动
  className?: string
  videoTitle?: string
  externalExportTrigger?: number // 外部触发导出弹窗，改变此值会打开弹窗
  noScrollContainer?: boolean // 不使用内部滚动容器（PC端使用外部滚动）
}

const AUTO_SCROLL_THRESHOLD_PX = 120

export function SubtitleList({
  subtitles,
  currentVideoTime,
  onSubtitleClick,
  onHighlightClick,
  displayMode,
  autoScroll: autoScrollProp = true, // 从外部接收，默认 true
  className,
  videoTitle = 'video',
  externalExportTrigger,
  noScrollContainer = false, // 默认使用内部滚动
}: SubtitleListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeSubtitleRef = useRef<HTMLDivElement>(null)

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('txt')

  // 监听外部触发导出弹窗
  useEffect(() => {
    if (externalExportTrigger !== undefined && externalExportTrigger > 0) {
      setIsExportDialogOpen(true)
    }
  }, [externalExportTrigger])

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
    if (!autoScrollProp || !activeSubtitleRef.current) return

    const activeElement = activeSubtitleRef.current

    // 找到滚动容器
    // 如果 noScrollContainer 为 true，需要找到父级滚动容器
    let scrollContainer: HTMLElement | null = null
    if (noScrollContainer) {
      // 向上查找具有 overflow-y-auto 的父容器
      let parent = activeElement.parentElement
      while (parent) {
        const overflow = getComputedStyle(parent).overflowY
        if (overflow === 'auto' || overflow === 'scroll') {
          scrollContainer = parent
          break
        }
        parent = parent.parentElement
      }
    } else {
      scrollContainer = containerRef.current
    }

    if (!scrollContainer || !activeElement) return

    const containerRect = scrollContainer.getBoundingClientRect()
    const activeRect = activeElement.getBoundingClientRect()

    // 当前字幕顶部相对于容器顶部的偏移（加上当前滚动位置）
    const scrollTop = scrollContainer.scrollTop
    const elementTop = activeRect.top - containerRect.top + scrollTop

    // 目标位置：元素在容器顶部留 10px 边距
    const targetScrollTop = elementTop - 10

    // 只有当元素不在可视区域顶部时才滚动
    const relativeTop = activeRect.top - containerRect.top
    const isNotAtTop = relativeTop > 20 || relativeTop < -20

    if (isNotAtTop) {
      scrollContainer.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth',
      })
    }
  }, [activeSubtitleId, autoScrollProp, noScrollContainer])

  // 格式化时间
  const formatSrtTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }, [])

  const generateExportContent = useCallback((format: ExportFormat): string => {
    if (subtitles.length === 0) return ''

    switch (format) {
      case 'txt':
        return subtitles
          .map((sub) => {
            if (displayMode === 'chinese' && sub.chinese_text) return sub.chinese_text
            if (displayMode === 'bilingual' && sub.chinese_text) return `${sub.original_text}\n${sub.chinese_text}`
            return sub.original_text
          })
          .join('\n\n')

      case 'srt':
        return subtitles
          .map((sub, index) => {
            const startTime = formatSrtTime(sub.start_time)
            const endTime = formatSrtTime(sub.end_time)
            let text = sub.original_text
            if (displayMode === 'bilingual' && sub.chinese_text) text = `${sub.original_text}\n${sub.chinese_text}`
            else if (displayMode === 'chinese' && sub.chinese_text) text = sub.chinese_text
            return `${index + 1}\n${startTime} --> ${endTime}\n${text}`
          })
          .join('\n\n')

      case 'json':
        return JSON.stringify(subtitles.map((sub) => ({
          id: sub.id,
          start_time: sub.start_time,
          end_time: sub.end_time,
          original_text: sub.original_text,
          chinese_text: sub.chinese_text,
        })), null, 2)

      default:
        return ''
    }
  }, [subtitles, displayMode, formatSrtTime])

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
      // 静默处理
    }
  }, [exportFormat, generateExportContent, videoTitle])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        noScrollContainer ? 'h-full' : 'h-full overflow-y-auto',
        'scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent',
        className
      )}
    >

      {/* 字幕列表 */}
      <div className="space-y-2 p-3">
        {subtitles.map((subtitle) => {
          const isActive = subtitle.id === activeSubtitleId

          return (
            <div
              key={subtitle.id}
              ref={isActive ? activeSubtitleRef : null}
              className={cn(
                'relative p-3 cursor-pointer transition-all duration-200 border-[2px]',
                isActive
                  ? 'bg-[#B4F416] dark:bg-teal-700 border-black dark:border-teal-500 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#555] -translate-y-0.5'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-black dark:hover:border-gray-500 hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666]'
              )}
              onClick={() => onSubtitleClick(subtitle)}
            >
              {/* 当前播放指示器 */}
              {isActive && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-black rounded-full animate-pulse" />
              )}

              {/* 时间戳 */}
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={cn(
                    'text-xs font-mono font-bold px-1.5 py-0.5 border',
                    isActive
                      ? 'bg-black text-white border-black'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                  )}
                >
                  {formatTime(subtitle.start_time)}
                </span>
                {isActive && (
                  <span className="text-xs font-black text-black animate-pulse">
                    ● 播放中
                  </span>
                )}
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
        <DialogContent className="sm:max-w-md border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">导出字幕</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              当前模式：{displayMode === 'bilingual' ? '双语' : displayMode === 'chinese' ? '中文' : '原文'}
            </p>

            <div className="grid grid-cols-3 gap-2">
              {EXPORT_FORMATS.map((format) => {
                const IconComponent = format.icon
                return (
                  <button
                    key={format.value}
                    onClick={() => setExportFormat(format.value)}
                    className={cn(
                      'flex flex-col items-center p-3 border-[2px] border-black transition-all',
                      exportFormat === format.value
                        ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                        : 'bg-white dark:bg-gray-700 hover:shadow-[2px_2px_0px_0px_#000]'
                    )}
                  >
                    <IconComponent className="w-6 h-6 mb-2" />
                    <span className="font-bold text-sm">{format.label}</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {format.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(false)}
              className="border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
            >
              取消
            </Button>
            <Button
              onClick={handleExport}
              className="bg-[#B4F416] text-black border-[2px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all font-bold"
            >
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
