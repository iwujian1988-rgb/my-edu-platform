'use client'

import { useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { SubtitleWithHighlights } from '@/types/video'

interface SingleLineSubtitleProps {
  subtitles: SubtitleWithHighlights[]
  currentVideoTime: number
  onSubtitleClick: (startTime: number) => void
  displayMode: 'bilingual' | 'original' | 'chinese'
  visible?: boolean
}

export function SingleLineSubtitle({
  subtitles,
  currentVideoTime,
  onSubtitleClick,
  displayMode,
  visible = true,
}: SingleLineSubtitleProps) {
  const activeSubtitle = useMemo(() => {
    for (const subtitle of subtitles) {
      if (
        currentVideoTime >= subtitle.start_time &&
        currentVideoTime < subtitle.end_time
      ) {
        return subtitle
      }
    }
    return null
  }, [subtitles, currentVideoTime])

  const handleClick = useCallback(() => {
    if (activeSubtitle) {
      onSubtitleClick(activeSubtitle.start_time)
    }
  }, [activeSubtitle, onSubtitleClick])

  if (!visible) return null

  const showOriginal = displayMode === 'bilingual' || displayMode === 'original'
  const showChinese = displayMode === 'bilingual' || displayMode === 'chinese'

  return (
    <div
      onClick={activeSubtitle ? handleClick : undefined}
      className={cn(
        'bg-black flex flex-col items-center justify-center px-4 cursor-pointer',
        'min-h-[2.5rem]',
        activeSubtitle ? 'hover:bg-black/70' : 'cursor-default'
      )}
    >
      {activeSubtitle ? (
        <>
          {showOriginal && (
            <span className="text-white text-sm font-bold text-center leading-tight">
              {activeSubtitle.original_text}
            </span>
          )}
          {showChinese && activeSubtitle.chinese_text && (
            <span className="text-white/60 text-xs text-center leading-tight">
              {activeSubtitle.chinese_text}
            </span>
          )}
        </>
      ) : (
        <span className="text-white/20 text-xs">·</span>
      )}
    </div>
  )
}
