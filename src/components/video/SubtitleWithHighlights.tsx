'use client'

/**
 * 带高亮的字幕渲染组件
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 2.2
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0
 *
 * 样式：Neo-Brutalism 风格下划线
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type {
  SubtitleWithHighlights as SubtitleWithHighlightsType,
  CardType,
  SubtitleHighlight,
} from '@/types/video'

// 高亮样式映射 - Neo-Brutalism 风格
const HIGHLIGHT_STYLES: Record<CardType, { underline: string; hover: string }> = {
  word: {
    underline: 'decoration-[#3B82F6] decoration-[3px] underline-offset-2',
    hover: 'hover:bg-blue-100',
  },
  phrase: {
    underline: 'decoration-[#22C55E] decoration-[3px] underline-offset-2',
    hover: 'hover:bg-green-100',
  },
  expression: {
    underline: 'decoration-[#A855F7] decoration-[3px] underline-offset-2',
    hover: 'hover:bg-purple-100',
  },
}

interface SubtitleWithHighlightsProps {
  subtitle: SubtitleWithHighlightsType
  isActive: boolean
  onHighlightClick: (cardType: CardType, cardId: string, event: React.MouseEvent) => void
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

      // 添加高亮文本 - Neo-Brutalism 风格下划线
      const styles = HIGHLIGHT_STYLES[highlight.card_type]
      segments.push(
        <button
          key={`highlight-${index}`}
          onClick={(e) => {
            e.stopPropagation()
            onHighlightClick(highlight.card_type, highlight.card_id, e)
          }}
          className={cn(
            'cursor-pointer px-0.5 transition-all underline',
            styles.underline,
            styles.hover
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
        <p className={cn(
          'text-[15px] font-medium leading-relaxed lg:text-sm lg:font-normal',
          isActive
            ? 'text-gray-800 dark:text-gray-900'
            : 'text-gray-700 dark:text-gray-300 lg:text-muted-foreground',
        )}>
          {subtitle.chinese_text || <span className="text-muted-foreground italic">暂无翻译</span>}
        </p>
      </div>
    )
  }

  if (displayMode === 'original') {
    return (
      <div className="space-y-1">
        <p className={cn(
          'text-[16px] font-semibold leading-[1.6] lg:text-sm lg:font-normal',
          isActive
            ? 'text-gray-950 dark:text-gray-950'
            : 'text-gray-900 dark:text-gray-100',
        )}>
          {renderHighlightedText(subtitle.original_text, sortedHighlights)}
        </p>
      </div>
    )
  }

  // bilingual - 双语显示
  return (
    <div className="space-y-1 lg:space-y-1">
      <p className={cn(
        'text-[16px] font-semibold leading-[1.6] lg:text-sm lg:font-normal',
        isActive
          ? 'text-gray-950 dark:text-gray-950'
          : 'text-gray-900 dark:text-gray-100',
      )}>
        {renderHighlightedText(subtitle.original_text, sortedHighlights)}
      </p>
      {subtitle.chinese_text && (
        <p className={cn(
          'text-[14px] leading-relaxed lg:text-xs',
          isActive
            ? 'text-gray-800 dark:text-gray-900'
            : 'text-[#4B5563] dark:text-gray-300 lg:text-muted-foreground',
        )}>
          {subtitle.chinese_text}
        </p>
      )}
    </div>
  )
}
