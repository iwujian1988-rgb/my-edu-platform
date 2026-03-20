'use client'

/**
 * 带高亮的字幕渲染组件
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 2.2
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type {
  SubtitleWithHighlights as SubtitleWithHighlightsType,
  CardType,
  SubtitleHighlight,
} from '@/types/video'

// 高亮颜色映射
const HIGHLIGHT_COLORS: Record<CardType, { bg: string; text: string; border: string }> = {
  word: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-b-2 border-blue-500',
  },
  phrase: {
    bg: 'bg-green-500/20',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-b-2 border-green-500',
  },
  expression: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-b-2 border-purple-500',
  },
}

interface SubtitleWithHighlightsProps {
  subtitle: SubtitleWithHighlightsType
  isActive: boolean
  onHighlightClick: (cardType: CardType, cardId: string) => void
  displayMode: 'bilingual' | 'original' | 'chinese'
}

export function SubtitleWithHighlights({
  subtitle,
  isActive,
  onHighlightClick,
  displayMode,
}: SubtitleWithHighlightsProps) {
  // 按位置排序高亮
  const sortedHighlights = useMemo(() => {
    return [...(subtitle.highlights || [])].sort(
      (a, b) => a.start_position - b.start_position
    )
  }, [subtitle.highlights])

  // 渲染带高亮的文本
  const renderHighlightedText = (text: string, highlights: SubtitleHighlight[]) => {
    if (!text || highlights.length === 0) {
      return <span>{text}</span>
    }

    const segments: React.ReactNode[] = []
    let lastIndex = 0

    highlights.forEach((highlight, index) => {
      // 添加高亮前的普通文本
      if (highlight.start_position > lastIndex) {
        segments.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, highlight.start_position)}
          </span>
        )
      }

      // 添加高亮文本
      const colors = HIGHLIGHT_COLORS[highlight.card_type]
      segments.push(
        <button
          key={`highlight-${index}`}
          onClick={(e) => {
            e.stopPropagation()
            onHighlightClick(highlight.card_type, highlight.card_id)
          }}
          className={cn(
            'cursor-pointer rounded px-0.5 transition-colors',
            'hover:bg-opacity-40',
            colors.bg,
            colors.text,
            colors.border
          )}
        >
          {highlight.text}
        </button>
      )

      lastIndex = highlight.end_position
    })

    // 添加最后一段普通文本
    if (lastIndex < text.length) {
      segments.push(<span key="text-end">{text.slice(lastIndex)}</span>)
    }

    return <>{segments}</>
  }

  // 根据显示模式渲染
  if (displayMode === 'chinese') {
    return (
      <div className="space-y-1">
        <p className="text-sm leading-relaxed">
          {subtitle.chinese_text || <span className="text-muted-foreground italic">暂无翻译</span>}
        </p>
      </div>
    )
  }

  if (displayMode === 'original') {
    return (
      <div className="space-y-1">
        <p className="text-sm leading-relaxed">
          {renderHighlightedText(subtitle.original_text, sortedHighlights)}
        </p>
      </div>
    )
  }

  // bilingual - 双语显示
  return (
    <div className="space-y-1">
      <p className="text-sm leading-relaxed">
        {renderHighlightedText(subtitle.original_text, sortedHighlights)}
      </p>
      {subtitle.chinese_text && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {subtitle.chinese_text}
        </p>
      )}
    </div>
  )
}
