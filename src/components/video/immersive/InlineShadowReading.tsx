'use client'

import { useCallback, useState, useEffect } from 'react'
import { ShadowReadingContent } from '@/components/video/ShadowReadingPanel'
import { Mic } from 'lucide-react'
import type { SubtitleWithHighlights } from '@/types/video'

interface InlineShadowReadingProps {
  videoId: string
  videoUrl: string | null
  subtitles: SubtitleWithHighlights[]
  isAudio?: boolean
  onPauseMainVideo: () => void
  onResumeMainVideo: () => void
  onComplete?: () => void
}

export function InlineShadowReading({
  videoId,
  videoUrl,
  subtitles,
  isAudio,
  onPauseMainVideo,
  onResumeMainVideo,
  onComplete,
}: InlineShadowReadingProps) {
  const [visible, setVisible] = useState(true)

  const handleClose = useCallback(() => {
    setVisible(false)
    onResumeMainVideo()
    onComplete?.()
  }, [onResumeMainVideo, onComplete])

  const handleReopen = useCallback(() => {
    setVisible(true)
    onPauseMainVideo()
  }, [onPauseMainVideo])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      onResumeMainVideo()
    }
  }, [onResumeMainVideo])

  if (!videoUrl) {
    return (
      <p className="text-center text-gray-400 py-4 text-xs">
        暂无音视频资源，无法使用跟读功能
      </p>
    )
  }

  if (!visible) {
    return (
      <div className="flex items-center justify-center py-5">
        <button
          onClick={handleReopen}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-gray-800 dark:bg-gray-700 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
        >
          <Mic className="w-4 h-4" />
          开始跟读
        </button>
      </div>
    )
  }

  return (
    <div className="border border-black dark:border-gray-600 rounded-lg overflow-hidden">
      <ShadowReadingContent
        videoId={videoId}
        videoUrl={videoUrl}
        subtitles={subtitles}
        isAudio={isAudio}
        onClose={handleClose}
      />
    </div>
  )
}
