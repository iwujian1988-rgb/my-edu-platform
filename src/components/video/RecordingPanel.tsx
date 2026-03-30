/**
 * 录音跟读面板组件
 *
 * 功能：
 * 1. 显示所有字幕列表，标记"已读"状态
 * 2. 点击字幕弹出练习弹层
 * 3. 弹层内：播放片段 + 录音 + 播放录音 + 重新录音
 * 4. 使用 STS Token 上传录音到 OSS
 */

'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  Volume2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { useRecordings } from '@/hooks/useRecordings'
import { WaveformDisplay } from '@/components/video/WaveformDisplay'
import type { SubtitleWithHighlights } from '@/types/video'

interface RecordingPanelProps {
  videoId: string
  videoUrl: string | null  // 视频URL，用于弹层内小窗口播放
  subtitles: SubtitleWithHighlights[]
  currentVideoTime: number
  onPlaySegment: (startTime: number, endTime: number) => void
  onPauseMainVideo?: () => void  // 打开弹层时暂停主视频
  onDialogClose?: () => void  // 关闭弹层时回调
  autoScroll?: boolean  // 外部控制自动滚动
  noScrollContainer?: boolean  // 不使用内部滚动容器（PC端使用外部滚动）
}

export function RecordingPanel({
  videoId,
  videoUrl,
  subtitles,
  currentVideoTime,
  onPlaySegment,
  onPauseMainVideo,
  onDialogClose,
  autoScroll: autoScrollProp = true,  // 从外部接收，默认 true
  noScrollContainer = false,  // PC端使用外部滚动
}: RecordingPanelProps) {
  // 弹层状态
  const [selectedSubtitle, setSelectedSubtitle] = useState<SubtitleWithHighlights | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 步骤状态
  const [hasListened, setHasListened] = useState(false)  // Step 1: 已听原声
  const [hasRecordedThisRound, setHasRecordedThisRound] = useState(false)  // Step 2: 本次已录音
  const [hasCompared, setHasCompared] = useState(false)  // Step 3: 已对比播放

  // 录音播放状态
  const [isPlayingRecording, setIsPlayingRecording] = useState(false)

  // 原声波形播放状态（Step 1 波形播放按钮）
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false)

  // 对比阶段：原声/录音各自独立播放状态
  const [isPlayingCompareOriginal, setIsPlayingCompareOriginal] = useState(false)
  const [isPlayingCompareRecording, setIsPlayingCompareRecording] = useState(false)

  // 录音播放用的 audio 元素
  const recordingAudioElRef = useRef<HTMLAudioElement | null>(null)
  const recordingProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 录音播放进度（0..1），用于波形高亮
  const [recordingProgress, setRecordingProgress] = useState(0)

  // 自动滚动相关
  const containerRef = useRef<HTMLDivElement>(null)
  const activeSubtitleRef = useRef<HTMLDivElement>(null)

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
    // 没有 activeSubtitleId 或关闭自动滚动时不滚动
    if (!activeSubtitleId || !autoScrollProp) return

    // 需要等待 DOM 更新后再滚动
    const timer = setTimeout(() => {
      if (!activeSubtitleRef.current) return

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

      if (!scrollContainer) return

      const containerRect = scrollContainer.getBoundingClientRect()
      const activeRect = activeElement.getBoundingClientRect()

      const scrollTop = scrollContainer.scrollTop
      const elementTop = activeRect.top - containerRect.top + scrollTop
      const targetScrollTop = elementTop - 10

      const relativeTop = activeRect.top - containerRect.top
      const isNotAtTop = relativeTop > 20 || relativeTop < -20

      if (isNotAtTop) {
        scrollContainer.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth',
        })
      }
    }, 50) // 等待 DOM 更新

    return () => clearTimeout(timer)
  }, [activeSubtitleId, currentVideoTime, autoScrollProp, noScrollContainer])

  // 小窗口视频播放器
  const miniVideoRef = useRef<HTMLVideoElement | null>(null)
  const [isMiniVideoPlaying, setIsMiniVideoPlaying] = useState(false)
  const segmentStartTimeRef = useRef<number>(0)
  const segmentEndTimeRef = useRef<number | null>(null)
  const [originalProgress, setOriginalProgress] = useState(0)

  // 播放视频片段（小窗口）
  const handlePlaySegmentInDialog = useCallback((startTime: number, endTime: number) => {
    const video = miniVideoRef.current
    if (!video) {
      // 如果小窗口视频不存在，回退到父组件的播放
      onPlaySegment(startTime, endTime)
      return
    }

    video.currentTime = startTime
    segmentStartTimeRef.current = startTime
    segmentEndTimeRef.current = endTime
    setOriginalProgress(0)
    video.play().catch(() => {
      // 自动播放被阻止或其他错误，静默处理
    })
    setIsMiniVideoPlaying(true)
    setIsPlayingOriginal(true)
  }, [onPlaySegment])

  // 字幕选中时立即预加载到起始位置（弹窗未打开也会执行，提前缓冲）
  useEffect(() => {
    if (!selectedSubtitle) return
    const video = miniVideoRef.current
    if (video && video.readyState >= 1) {
      // HAVE_METADATA 或更高，可以直接 seek
      video.currentTime = selectedSubtitle.start_time
    }
  }, [selectedSubtitle])

  // 弹窗打开时再次确保 seek 到位（兜底：video 可能在上次 effect 之后才就绪）
  useEffect(() => {
    if (!isDialogOpen || !selectedSubtitle) return
    const video = miniVideoRef.current
    if (video && video.readyState >= 1) {
      video.currentTime = selectedSubtitle.start_time
    }
  }, [isDialogOpen, selectedSubtitle])

  // 小窗口视频时间更新 - 追踪进度 + 到达片段结束时暂停
  useEffect(() => {
    if (!isMiniVideoPlaying) {
      return
    }

    const TICK_MS = 100
    const checkEndTime = setInterval(() => {
      const video = miniVideoRef.current
      if (!video || segmentEndTimeRef.current === null) return

      const segmentDuration = segmentEndTimeRef.current - segmentStartTimeRef.current
      const elapsed = video.currentTime - segmentStartTimeRef.current
      if (segmentDuration > 0) {
        setOriginalProgress(Math.min(elapsed / segmentDuration, 1))
      }

      if (video.currentTime >= segmentEndTimeRef.current) {
        video.pause()
        setIsMiniVideoPlaying(false)
        setOriginalProgress(1)
        segmentEndTimeRef.current = null
        setHasListened(true)
      }
    }, TICK_MS)

    return () => clearInterval(checkEndTime)
  }, [isMiniVideoPlaying])

  // 录音 Hook
  const {
    isRecording,
    isUploading,
    uploadProgress,
    uploadStatus,
    recordings,
    error: recordingError,
    startRecording,
    stopRecording,
    deleteRecording,
    uploadRecordingBackground,
    audioURL,
    clearRecording,
    duration: localRecordingDuration, // 本地录音时长（WebM 无法自动获取）
    pendingUploadSubtitleId,
  } = useRecordings({
    videoId,
  })

  // 当前选中字幕的录音
  const selectedRecording = useMemo(() => {
    if (!selectedSubtitle) return null
    return recordings.find((r) => r.subtitle_id === selectedSubtitle.id)
  }, [selectedSubtitle, recordings])

  // 检查字幕是否有录音（"已读"状态）— 乐观更新：录音停止即标记，不等上传完成
  const [locallyRecordedIds, setLocallyRecordedIds] = useState<Set<string>>(new Set())
  const hasRecorded = useCallback(
    (subtitleId: string) =>
      locallyRecordedIds.has(subtitleId) || recordings.some((r) => r.subtitle_id === subtitleId),
    [locallyRecordedIds, recordings]
  )

  // 打开练习弹层
  const handleOpenPractice = useCallback((subtitle: SubtitleWithHighlights) => {
    setSelectedSubtitle(subtitle)
    setIsDialogOpen(true)
    clearRecording()

    // 检查是否已有录音
    const existingRecording = recordings.find((r) => r.subtitle_id === subtitle.id)
    const hasExistingRecording = !!existingRecording

    // 根据是否已有录音设置初始状态
    if (hasExistingRecording) {
      // 已有录音，直接跳到第三步
      setHasListened(true)
      setHasRecordedThisRound(true)
      setHasCompared(false)
    } else {
      // 无录音，从头开始
      setHasListened(false)
      setHasRecordedThisRound(false)
      setHasCompared(false)
    }

    // 暂停主窗口视频
    onPauseMainVideo?.()
  }, [clearRecording, onPauseMainVideo, recordings])

  // 停止播放录音（定义在 handleDialogOpenChange 之前，避免 TDZ 引用错误）
  const handleStopPlaying = useCallback(() => {
    if (recordingProgressIntervalRef.current) {
      clearInterval(recordingProgressIntervalRef.current)
      recordingProgressIntervalRef.current = null
    }
    if (recordingAudioElRef.current) {
      recordingAudioElRef.current.pause()
      recordingAudioElRef.current.src = ''
      recordingAudioElRef.current = null
    }
    setRecordingProgress(0)
    setIsPlayingRecording(false)
    setIsPlayingCompareRecording(false)
  }, [])

  // 关闭弹层 - 处理录音状态清理
  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      // 关闭弹层时停止录音（不保存）
      if (isRecording) {
        stopRecording()
      }
      // 停止播放录音
      if (isPlayingRecording || isPlayingCompareRecording) {
        handleStopPlaying()
      }
      // 停止原声播放
      if (isPlayingOriginal || isPlayingCompareOriginal) {
        const video = miniVideoRef.current
        if (video) video.pause()
        setIsPlayingOriginal(false)
        setIsPlayingCompareOriginal(false)
      }
      // 通知父组件重置状态
      onDialogClose?.()
    }
    setIsDialogOpen(open)
  }, [isRecording, stopRecording, isPlayingRecording, isPlayingCompareRecording, isPlayingOriginal, isPlayingCompareOriginal, handleStopPlaying, onDialogClose])

  // 开始录音
  const handleStartRecording = useCallback(() => {
    if (!selectedSubtitle) return
    startRecording(selectedSubtitle.id)
  }, [selectedSubtitle, startRecording])

  // 停止录音 - 等待 blob 准备好后后台静默上传
  const handleStopRecording = useCallback(async () => {
    // stopRecording 现在返回 Promise，等待 onstop 完成
    await stopRecording()

    // 标记已录音（本地 Blob URL 已可用）
    setHasRecordedThisRound(true)

    // 乐观标记"已读"状态，不等上传完成
    if (selectedSubtitle) {
      setLocallyRecordedIds(prev => new Set(prev).add(selectedSubtitle.id))
      uploadRecordingBackground(selectedSubtitle.id)
    }
  }, [stopRecording, uploadRecordingBackground, selectedSubtitle])

  // 播放录音 — 统一用 Audio.play()（createMediaElementSource 对 blob/OSS 均有兼容问题）
  const playWithGain = useCallback(async (audioUrl: string, onPlaybackEnd?: () => void) => {
    // 停止上一次播放
    if (recordingProgressIntervalRef.current) {
      clearInterval(recordingProgressIntervalRef.current)
      recordingProgressIntervalRef.current = null
    }
    if (recordingAudioElRef.current) {
      recordingAudioElRef.current.pause()
      recordingAudioElRef.current.src = ''
      recordingAudioElRef.current = null
    }

    const audio = new Audio(audioUrl)
    recordingAudioElRef.current = audio

    audio.onended = () => {
      if (recordingProgressIntervalRef.current) {
        clearInterval(recordingProgressIntervalRef.current)
        recordingProgressIntervalRef.current = null
      }
      setRecordingProgress(1)
      setIsPlayingRecording(false)
      setIsPlayingCompareRecording(false)
      onPlaybackEnd?.()
    }

    try {
      await audio.play()
      setIsPlayingRecording(true)
      // 开始进度追踪
      setRecordingProgress(0)
      recordingProgressIntervalRef.current = setInterval(() => {
        if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
          setRecordingProgress(audio.currentTime / audio.duration)
        }
      }, 100)
    } catch {
      if (recordingProgressIntervalRef.current) {
        clearInterval(recordingProgressIntervalRef.current)
        recordingProgressIntervalRef.current = null
      }
      setIsPlayingRecording(false)
      setIsPlayingCompareRecording(false)
    }
  }, [])

  // 播放录音
  const handlePlayRecording = useCallback(() => {
    const ossUrl = selectedRecording?.recording_url
    const localUrl = audioURL

    const onEnd = () => {
      setHasCompared(true)
    }

    // 优先使用本地 Blob URL（刚录完的）
    if (localUrl) {
      playWithGain(localUrl, onEnd)
      return
    }

    // 播放 OSS 录音
    if (ossUrl) {
      playWithGain(ossUrl, onEnd)
      return
    }
  }, [selectedRecording, audioURL, playWithGain])

  // 重新录音
  const handleRerecord = useCallback(async () => {
    // 停止播放
    handleStopPlaying()

    // 删除旧录音
    if (selectedRecording) {
      await deleteRecording(selectedRecording.id)
    }

    // 清除本地录音
    clearRecording()

    // 开始新录音
    if (selectedSubtitle) {
      startRecording(selectedSubtitle.id)
    }
  }, [handleStopPlaying, selectedRecording, deleteRecording, clearRecording, selectedSubtitle, startRecording])

  // 清理
  useEffect(() => {
    return () => {
      if (recordingAudioElRef.current) {
        recordingAudioElRef.current.pause()
        recordingAudioElRef.current.src = ''
      }
    }
  }, [])

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 是否有可播放的录音
  const hasPlayableRecording = selectedRecording || audioURL

  // Step 1: 原声波形播放（隐藏 mini video，用 WaveformDisplay + 隐藏 video 音频）
  const handleOriginalWaveformPlay = useCallback(() => {
    if (!selectedSubtitle || !videoUrl) return
    if (isPlayingOriginal) {
      // 暂停
      const video = miniVideoRef.current
      if (video) {
        video.pause()
      }
      setIsPlayingOriginal(false)
      return
    }
    handlePlaySegmentInDialog(selectedSubtitle.start_time, selectedSubtitle.end_time)
    setIsPlayingOriginal(true)
  }, [selectedSubtitle, videoUrl, isPlayingOriginal, handlePlaySegmentInDialog])

  // 原声播放结束回调
  const handleOriginalEnded = useCallback(() => {
    setIsPlayingOriginal(false)
    setHasListened(true)
  }, [])

  // Step 3 对比: 播放原声
  const handleCompareOriginalPlay = useCallback(() => {
    if (!selectedSubtitle || !videoUrl) return
    if (isPlayingCompareOriginal) {
      const video = miniVideoRef.current
      if (video) video.pause()
      setIsPlayingCompareOriginal(false)
      return
    }
    // 停止另一方的播放
    if (isPlayingCompareRecording) {
      handleStopPlaying()
    }
    handlePlaySegmentInDialog(selectedSubtitle.start_time, selectedSubtitle.end_time)
    setIsPlayingCompareOriginal(true)
  }, [selectedSubtitle, videoUrl, isPlayingCompareOriginal, isPlayingCompareRecording, handlePlaySegmentInDialog, handleStopPlaying])

  // Step 3 对比: 播放录音
  const handleCompareRecordingPlay = useCallback(() => {
    if (isPlayingCompareRecording) {
      handleStopPlaying()
      return
    }
    // 停止另一方的播放
    if (isPlayingCompareOriginal) {
      const video = miniVideoRef.current
      if (video) video.pause()
      setIsPlayingCompareOriginal(false)
    }

    const ossUrl = selectedRecording?.recording_url
    const localUrl = audioURL
    const url = localUrl || ossUrl
    if (!url) return

    setIsPlayingCompareRecording(true)
    playWithGain(url, () => {
      setIsPlayingCompareRecording(false)
      setHasCompared(true)
    })
  }, [isPlayingCompareRecording, isPlayingCompareOriginal, handleStopPlaying, selectedRecording, audioURL, playWithGain])

  // 录音 URL（用于波形展示）
  const recordingAudioUrl = useMemo(() => {
    return audioURL || selectedRecording?.recording_url || ''
  }, [audioURL, selectedRecording])

  return (
    <>
      {/* 持久化 video 元素：放在 Dialog 外部避免弹窗关闭时被卸载导致重新加载 */}
      {videoUrl && (
        <video
          ref={miniVideoRef}
          src={videoUrl}
          className="absolute w-0 h-0 overflow-hidden opacity-0 pointer-events-none"
          playsInline
          preload="auto"
          onEnded={() => {
            setIsMiniVideoPlaying(false)
            setIsPlayingOriginal(false)
            setIsPlayingCompareOriginal(false)
            setHasListened(true)
          }}
          onPause={() => {
            setIsMiniVideoPlaying(false)
            setIsPlayingOriginal(false)
            setIsPlayingCompareOriginal(false)
            setOriginalProgress(0)
          }}
        />
      )}

      {/* 字幕列表 */}
      <div ref={containerRef} className={cn(
        'h-full scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent',
        noScrollContainer ? '' : 'overflow-y-auto'
      )}>
        <div className="space-y-2 p-3">
          {/* 跟读指引 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs text-gray-500 dark:text-gray-400">
            <span className="font-bold text-gray-600 dark:text-gray-300">跟读步骤：</span>
            <span>点击字幕</span>
            <span className="text-gray-300 dark:text-gray-600">→</span>
            <span>听原声</span>
            <span className="text-gray-300 dark:text-gray-600">→</span>
            <span>跟读录音</span>
            <span className="text-gray-300 dark:text-gray-600">→</span>
            <span>对比播放</span>
          </div>
          {subtitles.map((subtitle) => {
            const hasRecording = hasRecorded(subtitle.id)
            const isActive =
              currentVideoTime >= subtitle.start_time &&
              currentVideoTime < subtitle.end_time

            return (
              <div
                key={subtitle.id}
                ref={isActive ? activeSubtitleRef : null}
                onClick={() => handleOpenPractice(subtitle)}
                className={cn(
                  'relative p-3 cursor-pointer transition-all duration-200 border-[2px]',
                  isActive
                    ? 'bg-[#B4F416] dark:bg-teal-700 border-black dark:border-teal-500 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#555] -translate-y-0.5'
                    : hasRecording
                      ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-400 dark:border-purple-600 hover:border-purple-500 hover:shadow-[2px_2px_0px_0px_#a855f7]'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-black dark:hover:border-gray-500 hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666]'
                )}
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
                        : hasRecording
                          ? 'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-600'
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
                  {hasRecording && !isActive && (
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-0.5">
                      <Mic className="w-3 h-3" />
                      已跟读
                    </span>
                  )}
                </div>

                {/* 字幕内容 */}
                <p className={cn(
                  'text-sm font-medium',
                  isActive ? 'text-black' : 'text-gray-800 dark:text-gray-200'
                )}>
                  {subtitle.original_text}
                </p>
                {subtitle.chinese_text && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {subtitle.chinese_text}
                  </p>
                )}

                {/* 上传中状态 */}
                {pendingUploadSubtitleId === subtitle.id && (
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="outline"
                      className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 text-[10px] px-1.5 py-0"
                    >
                      <Loader2 className="w-3 h-3 mr-0.5 animate-spin" />
                      上传中
                    </Badge>
                  </div>
                )}
              </div>
            )
          })}

          {subtitles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              暂无字幕
            </div>
          )}
        </div>
      </div>

      {/* 练习弹层 */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">跟读练习</DialogTitle>
          </DialogHeader>

          {selectedSubtitle && (
            <div className="space-y-4">
              {/* 步骤指示器 */}
              <div className="flex items-center justify-between px-2">
                {/* Step 1: 听原声 */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-[2px] font-black text-sm transition-all",
                    hasListened
                      ? "bg-green-500 text-white border-green-600"
                      : "bg-[#B4F416] text-black border-black shadow-[2px_2px_0px_0px_#000]"
                  )}>
                    {hasListened ? <CheckCircle className="w-5 h-5" /> : "1"}
                  </div>
                  <span className="text-xs font-bold mt-1">听原声</span>
                </div>

                {/* 连接线 */}
                <div className={cn(
                  "flex-1 h-1 mx-2 rounded transition-all",
                  hasListened ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                )} />

                {/* Step 2: 跟读 */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-[2px] font-black text-sm transition-all",
                    hasRecordedThisRound
                      ? "bg-green-500 text-white border-green-600"
                      : hasListened
                        ? "bg-[#B4F416] text-black border-black shadow-[2px_2px_0px_0px_#000]"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-400 border-gray-300 dark:border-gray-600"
                  )}>
                    {hasRecordedThisRound ? <CheckCircle className="w-5 h-5" /> : "2"}
                  </div>
                  <span className="text-xs font-bold mt-1">跟读</span>
                </div>

                {/* 连接线 */}
                <div className={cn(
                  "flex-1 h-1 mx-2 rounded transition-all",
                  hasRecordedThisRound ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                )} />

                {/* Step 3: 对比 */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-[2px] font-black text-sm transition-all",
                    hasCompared
                      ? "bg-green-500 text-white border-green-600"
                      : hasRecordedThisRound
                        ? "bg-[#B4F416] text-black border-black shadow-[2px_2px_0px_0px_#000]"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-400 border-gray-300 dark:border-gray-600"
                  )}>
                    {hasCompared ? <CheckCircle className="w-5 h-5" /> : "3"}
                  </div>
                  <span className="text-xs font-bold mt-1">对比</span>
                </div>
              </div>

              {/* Step 1: 原声波形（替代 mini video） */}
              {!hasListened && videoUrl && (
                <WaveformDisplay
                  audioSrc={videoUrl}
                  color="#3B82F6"
                  playingColor="#60A5FA"
                  label="原声"
                  isPlaying={isPlayingOriginal}
                  onPlay={handleOriginalWaveformPlay}
                  onEnded={handleOriginalEnded}
                  usePlaceholderPeaks
                  seed={selectedSubtitle.start_time * 1000}
                  progress={originalProgress}
                />
              )}

              {/* 字幕内容 */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border-[2px] border-black dark:border-gray-600">
                <p className="text-base font-bold text-black dark:text-white">
                  {selectedSubtitle.original_text}
                </p>
                {selectedSubtitle.chinese_text && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedSubtitle.chinese_text}
                  </p>
                )}
              </div>

              {/* 后台上传状态指示器（右上角小气泡） */}
              {isUploading && (
                <div className="flex items-center gap-2 text-blue-500 text-xs bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full w-fit ml-auto">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{uploadStatus || `上传中 ${uploadProgress}%`}</span>
                </div>
              )}

              {/* 错误提示 */}
              {recordingError && (
                <div className="flex items-center gap-2 text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border-[2px] border-red-300 dark:border-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-bold">{recordingError}</span>
                </div>
              )}

              {/* 主操作区 */}
              <div className="space-y-4">
                {/* 正在录音时 */}
                {isRecording && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-red-500">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="font-bold">正在录音中...</span>
                    </div>
                    <Button
                      size="lg"
                      onClick={handleStopRecording}
                      className="bg-red-500 hover:bg-red-600 text-white border-[2px] border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all font-bold px-8 py-6 text-lg"
                    >
                      <Square className="w-5 h-5 mr-2" />
                      点击停止
                    </Button>
                  </div>
                )}

                {/* Step 3: 双波形对比（已录音，非录音中） */}
                {!isRecording && hasRecordedThisRound && hasPlayableRecording && videoUrl && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                      对比原声与你的录音
                    </div>
                    {/* 原声波形 */}
                    <WaveformDisplay
                      audioSrc={videoUrl}
                      color="#3B82F6"
                      playingColor="#60A5FA"
                      label="原声"
                      isPlaying={isPlayingCompareOriginal}
                      onPlay={handleCompareOriginalPlay}
                      onEnded={() => {
                        setIsPlayingCompareOriginal(false)
                      }}
                      usePlaceholderPeaks
                      seed={selectedSubtitle.start_time * 1000}
                      progress={originalProgress}
                    />
                    {/* 录音波形 */}
                    <WaveformDisplay
                      audioSrc={recordingAudioUrl}
                      color="#22C55E"
                      playingColor="#4ADE80"
                      label="你的录音"
                      isPlaying={isPlayingCompareRecording}
                      onPlay={handleCompareRecordingPlay}
                      onEnded={() => {
                        setIsPlayingCompareRecording(false)
                        setHasCompared(true)
                      }}
                      usePlaceholderPeaks
                      seed={selectedSubtitle.start_time * 1000 + 1}
                      progress={recordingProgress}
                    />
                  </div>
                )}

                {/* 正在播放录音时（非对比阶段，单独播放录音） */}
                {isPlayingRecording && !isRecording && !(hasRecordedThisRound && videoUrl) && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-blue-500">
                      <Volume2 className="w-4 h-4 animate-pulse" />
                      <span className="font-bold">正在播放你的录音...</span>
                    </div>
                    <Button
                      size="lg"
                      onClick={() => {
                        handleStopPlaying()
                        setHasCompared(true)
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white border-[2px] border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all font-bold px-8 py-6 text-lg"
                    >
                      <Square className="w-5 h-5 mr-2" />
                      停止播放
                    </Button>
                  </div>
                )}

                {/* 默认状态：显示当前推荐操作 */}
                {!isRecording && !isPlayingRecording && !hasRecordedThisRound && (
                  <div className="flex flex-col items-center gap-3">
                    {/* Step 2: 跟读（已听但未录音时显示） */}
                    {hasListened && (
                      <Button
                        size="lg"
                        onClick={handleStartRecording}
                        className="bg-[#B4F416] hover:bg-[#9FE010] text-black border-[3px] border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-1 transition-all font-bold px-8 py-6 text-lg"
                      >
                        <Mic className="w-5 h-5 mr-2" />
                        点击开始跟读
                      </Button>
                    )}
                  </div>
                )}

                {/* 次要操作：已完成的步骤可重做 */}
                {!isRecording && !isPlayingRecording && (hasListened || hasRecordedThisRound) && (
                  <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {hasListened && !hasRecordedThisRound && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlaySegmentInDialog(selectedSubtitle.start_time, selectedSubtitle.end_time)}
                        className="text-gray-500 hover:text-black dark:hover:text-white"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        重听原声
                      </Button>
                    )}
                    {hasRecordedThisRound && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleStartRecording}
                        className="text-gray-500 hover:text-black dark:hover:text-white"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        重新录音
                      </Button>
                    )}
                    {hasCompared && hasPlayableRecording && !hasRecordedThisRound && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePlayRecording}
                        className="text-gray-500 hover:text-black dark:hover:text-white"
                      >
                        <Volume2 className="w-3 h-3 mr-1" />
                        再听对比
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* 完成提示 */}
              {hasListened && hasRecordedThisRound && hasCompared && (
                <div className="flex items-center justify-center gap-2 text-green-600 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-[2px] border-green-300 dark:border-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold">本句练习完成！</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
