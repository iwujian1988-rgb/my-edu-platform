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
  const audioRef = useRef<HTMLAudioElement | null>(null)

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
  const segmentEndTimeRef = useRef<number | null>(null)

  // 播放视频片段（小窗口）
  const handlePlaySegmentInDialog = useCallback((startTime: number, endTime: number) => {
    const video = miniVideoRef.current
    if (!video) {
      // 如果小窗口视频不存在，回退到父组件的播放
      onPlaySegment(startTime, endTime)
      return
    }

    video.currentTime = startTime
    segmentEndTimeRef.current = endTime
    video.play()
    setIsMiniVideoPlaying(true)
  }, [onPlaySegment])

  // 小窗口视频时间更新 - 到达片段结束时暂停（使用 interval 更可靠）
  useEffect(() => {
    if (!isMiniVideoPlaying) return

    const checkEndTime = setInterval(() => {
      const video = miniVideoRef.current
      if (video && segmentEndTimeRef.current && video.currentTime >= segmentEndTimeRef.current) {
        video.pause()
        setIsMiniVideoPlaying(false)
        segmentEndTimeRef.current = null
        // ✅ 修复：通过 interval 暂停时也要标记为已听
        setHasListened(true)
      }
    }, 100) // 每 100ms 检查一次

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

  // 检查字幕是否有录音（"已读"状态）
  const hasRecorded = useCallback(
    (subtitleId: string) => recordings.some((r) => r.subtitle_id === subtitleId),
    [recordings]
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

  // 关闭弹层 - 处理录音状态清理
  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      // 关闭弹层时停止录音（不保存）
      if (isRecording) {
        stopRecording()
      }
      // 停止播放录音
      if (isPlayingRecording && audioRef.current) {
        audioRef.current.pause()
        setIsPlayingRecording(false)
      }
      // 通知父组件重置状态
      onDialogClose?.()
    }
    setIsDialogOpen(open)
  }, [isRecording, stopRecording, isPlayingRecording, onDialogClose])

  // 播放视频片段
  const handlePlaySegment = useCallback(() => {
    if (!selectedSubtitle) return
    onPlaySegment(selectedSubtitle.start_time, selectedSubtitle.end_time)
  }, [selectedSubtitle, onPlaySegment])

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

    // 后台静默上传（不阻塞用户操作）
    if (selectedSubtitle) {
      uploadRecordingBackground(selectedSubtitle.id)
    }
  }, [stopRecording, uploadRecordingBackground, selectedSubtitle])

  // 播放音频（带增益，解决录音音量小的问题）
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  const playWithGain = useCallback(async (audioUrl: string, knownDuration?: number) => {
    try {
      // 创建 AudioContext 和 GainNode（2x 增益）
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
      const ctx = audioContextRef.current

      // 如果 ctx 被暂停，恢复它
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }

      // 获取音频数据
      const response = await fetch(audioUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

      // 创建增益节点（2x 音量）
      const gainNode = ctx.createGain()
      gainNode.gain.value = 2.0  // 2x 增益
      gainNode.connect(ctx.destination)
      gainNodeRef.current = gainNode

      // 创建音频源
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(gainNode)

      // 播放结束回调
      source.onended = () => {
        console.log('[RecordingPanel] 🏁 播放结束')
        setIsPlayingRecording(false)
        setHasCompared(true)  // 标记已对比播放
      }

      source.start(0)
      setIsPlayingRecording(true)
      console.log(`[RecordingPanel] ✅ 播放中 (2x 增益)，时长: ${audioBuffer.duration.toFixed(1)}s`)

    } catch (err) {
      console.error('[RecordingPanel] ❌ 播放失败:', err)
      setIsPlayingRecording(false)
    }
  }, [])

  // 播放录音
  const handlePlayRecording = useCallback(() => {
    const ossUrl = selectedRecording?.recording_url
    const localUrl = audioURL

    // 优先使用本地 Blob URL（刚录完的）
    if (localUrl) {
      playWithGain(localUrl)
      return
    }

    // 播放 OSS 录音
    if (ossUrl) {
      playWithGain(ossUrl, selectedRecording?.duration)
      return
    }

    console.warn('[RecordingPanel] ⚠️ 没有可播放的录音')
  }, [selectedRecording, audioURL, playWithGain])

  // 停止播放录音
  const handleStopPlaying = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlayingRecording(false)
  }, [])

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
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
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

  return (
    <>
      {/* 字幕列表 */}
      <div ref={containerRef} className={cn(
        'h-full scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent',
        noScrollContainer ? '' : 'overflow-y-auto'
      )}>
        <div className="space-y-2 p-3">
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

              {/* 小窗口视频播放器 */}
              {videoUrl && (
                <div className="relative rounded-lg overflow-hidden border-[2px] border-black dark:border-gray-600 bg-black">
                  <video
                    ref={miniVideoRef}
                    src={videoUrl}
                    className="w-full h-32 object-cover"
                    playsInline
                    onPlay={() => setIsMiniVideoPlaying(true)}
                    onPause={() => setIsMiniVideoPlaying(false)}
                    onEnded={() => {
                      setIsMiniVideoPlaying(false)
                      // 播放完成标记为已听
                      setHasListened(true)
                    }}
                  />
                  {/* 播放状态指示器 */}
                  {isMiniVideoPlaying && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      播放中
                    </div>
                  )}
                </div>
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

              {/* 主操作区 - 当前推荐的大按钮 */}
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

                {/* 正在播放录音时 */}
                {isPlayingRecording && !isRecording && (
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

                {/* 默认状态：显示当前推荐操作（上传在后台进行，不阻塞） */}
                {!isRecording && !isPlayingRecording && (
                  <div className="flex flex-col items-center gap-3">
                    {/* Step 1: 听原声（未听时显示） */}
                    {!hasListened && (
                      <Button
                        size="lg"
                        onClick={() => handlePlaySegmentInDialog(selectedSubtitle.start_time, selectedSubtitle.end_time)}
                        className="bg-[#B4F416] hover:bg-[#9FE010] text-black border-[3px] border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-1 transition-all font-bold px-8 py-6 text-lg"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        点击播放原声
                      </Button>
                    )}

                    {/* Step 2: 跟读（已听但未录音时显示） */}
                    {hasListened && !hasRecordedThisRound && (
                      <Button
                        size="lg"
                        onClick={handleStartRecording}
                        className="bg-[#B4F416] hover:bg-[#9FE010] text-black border-[3px] border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-1 transition-all font-bold px-8 py-6 text-lg"
                      >
                        <Mic className="w-5 h-5 mr-2" />
                        点击开始跟读
                      </Button>
                    )}

                    {/* Step 3: 对比（已录音但未对比时显示） */}
                    {hasRecordedThisRound && !hasCompared && hasPlayableRecording && (
                      <Button
                        size="lg"
                        onClick={handlePlayRecording}
                        className="bg-[#B4F416] hover:bg-[#9FE010] text-black border-[3px] border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-1 transition-all font-bold px-8 py-6 text-lg"
                      >
                        <Volume2 className="w-5 h-5 mr-2" />
                        点击播放对比
                      </Button>
                    )}

                    {/* 已完成全部步骤：显示重做选项 */}
                    {hasListened && hasRecordedThisRound && hasCompared && (
                      <div className="text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-green-600 font-bold">
                          <CheckCircle className="w-5 h-5" />
                          本句练习完成！
                        </div>
                      </div>
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
                    {hasCompared && hasPlayableRecording && (
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
