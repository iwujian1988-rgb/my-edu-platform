'use client'

/**
 * 视频播放器组件
 *
 * 优化：点击封面图才加载视频，节省流量
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Video } from '@/types/video'

const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
]

const HIDE_CONTROLS_DELAY_MS = 3000

interface VideoPlayerProps {
  video: Video
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
  initialPosition?: number
  seekTo?: number // 外部控制：跳转到指定时间
  seekTrigger?: number // 用于强制触发跳转（即使时间相同）
  segmentEndTime?: number // 片段播放：到达此时间后自动暂停
  pause?: boolean // 外部控制：暂停视频
  autoPlay?: boolean
  className?: string
}

export function VideoPlayer({
  video,
  onTimeUpdate,
  onEnded,
  initialPosition = 0,
  seekTo,
  seekTrigger,
  segmentEndTime,
  pause,
  autoPlay = false,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [hasStarted, setHasStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const shouldAutoPlayRef = useRef(false) // 标记是否应该自动播放

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current)
    }
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false)
      }, HIDE_CONTROLS_DELAY_MS)
    }
  }, [isPlaying])

  const handleSpeedChange = useCallback((speed: number) => {
    const videoEl = videoRef.current
    if (!videoEl) return
    videoEl.playbackRate = speed
    setPlaybackSpeed(speed)
  }, [])

  // 点击封面开始播放
  const handleStartPlay = useCallback(async () => {
    setHasStarted(true)
    setIsLoading(true)
    shouldAutoPlayRef.current = true // 标记需要自动播放

    // 立即尝试播放（在用户点击事件上下文中）
    // 这样可以绕过浏览器的自动播放限制
    const videoEl = videoRef.current
    if (videoEl) {
      videoEl.load()
      // 等待一小段时间让视频开始加载，然后尝试播放
      await new Promise(resolve => setTimeout(resolve, 100))
      try {
        await videoEl.play()
        shouldAutoPlayRef.current = false // 已成功播放，不需要再在 handleCanPlay 中播放
      } catch {
        // 播放失败，等待 handleCanPlay 重试
      }
    }
  }, [])

  // 当 hasStarted 变为 true 后加载视频
  useEffect(() => {
    if (!hasStarted) return

    const videoEl = videoRef.current
    if (!videoEl) return

    // 设置初始位置
    if (initialPosition > 0) {
      videoEl.currentTime = initialPosition
    }

    // 加载并播放视频
    videoEl.load()
  }, [hasStarted, initialPosition])

  // 外部控制：跳转到指定时间
  useEffect(() => {
    if (seekTo === undefined || seekTo < 0) return

    const videoEl = videoRef.current
    if (!videoEl) return

    // 如果视频还没开始播放，先触发播放
    if (!hasStarted) {
      setHasStarted(true)
      setIsLoading(true)
      // 设置一个 ref 来记住要跳转的位置，等加载完成后再跳转
      pendingSeekRef.current = seekTo
      return
    }

    // 视频已加载，直接跳转
    videoEl.currentTime = seekTo

    // 如果视频暂停，尝试播放
    if (videoEl.paused) {
      videoEl.play().catch(() => {})
    }
  }, [seekTo, seekTrigger, hasStarted]) // 添加 seekTrigger 依赖

  // 外部控制：暂停视频
  useEffect(() => {
    if (!pause) return

    const videoEl = videoRef.current
    if (videoEl && !videoEl.paused) {
      videoEl.pause()
      setIsPlaying(false)
    }
  }, [pause])

  // 存储 pending 的跳转位置
  const pendingSeekRef = useRef<number | null>(null)

  // 视频可以播放时，处理 pending 的跳转并自动播放
  const handleCanPlayThrough = useCallback(() => {
    const videoEl = videoRef.current
    if (!videoEl || !hasStarted) return

    setIsLoading(false)

    // 处理 pending 的跳转
    if (pendingSeekRef.current !== null) {
      videoEl.currentTime = pendingSeekRef.current
      pendingSeekRef.current = null

      // 跳转完成后自动播放
      videoEl.play().catch(() => {})
    }
  }, [hasStarted])

  const togglePlay = useCallback(async () => {
    const videoEl = videoRef.current
    if (!videoEl) return

    try {
      if (isPlaying) {
        videoEl.pause()
      } else {
        await videoEl.play()
      }
    } catch (error) {
      console.error('[VideoPlayer] Play error:', error)
    }
  }, [isPlaying])

  const seek = useCallback((time: number) => {
    const videoEl = videoRef.current
    if (!videoEl) return
    videoEl.currentTime = Math.max(0, Math.min(time, duration))
  }, [duration])

  const handleVolumeChange = useCallback((value: number[]) => {
    const videoEl = videoRef.current
    if (!videoEl) return
    const newVolume = value[0]
    videoEl.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }, [])

  const toggleMute = useCallback(() => {
    const videoEl = videoRef.current
    if (!videoEl) return
    videoEl.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('[VideoPlayer] Fullscreen error:', error)
    }
  }, [])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleLoadedMetadata = () => {
    const videoEl = videoRef.current
    if (!videoEl) return

    setDuration(videoEl.duration)

    // 设置初始位置
    if (initialPosition > 0) {
      videoEl.currentTime = initialPosition
    }
  }

  const handleTimeUpdate = () => {
    const videoEl = videoRef.current
    if (!videoEl) return
    setCurrentTime(videoEl.currentTime)
    onTimeUpdate?.(videoEl.currentTime)

    // 片段播放：到达结束时间后自动暂停
    if (segmentEndTime !== undefined && segmentEndTime > 0) {
      if (videoEl.currentTime + 0.1 >= segmentEndTime) {
        videoEl.pause()
      }
    }
  }

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleEnded = () => {
    setIsPlaying(false)
    onEnded?.()
  }

  const handleWaiting = () => setIsLoading(true)
  const handleCanPlay = () => {
    setIsLoading(false)

    const videoEl = videoRef.current
    if (!videoEl) return

    // 如果是刚点击封面开始播放，自动播放
    if (shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false
      videoEl.play().catch(() => {})
    }

    // 备用：处理 pending 的跳转（如果 handleCanPlayThrough 没触发)
    if (pendingSeekRef.current !== null) {
      videoEl.currentTime = pendingSeekRef.current
      pendingSeekRef.current = null
      videoEl.play().catch(() => {})
    }
  }

  useEffect(() => {
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black overflow-hidden group',
        isFullscreen ? 'fixed inset-0 z-50' : '',
        className
      )}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* 视频元素 - 只有开始后才设置 src */}
      <video
        ref={videoRef}
        src={hasStarted ? video.video_url : undefined}
        className="w-full aspect-video"
        preload="none"
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlayThrough={handleCanPlayThrough}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
      />

      {/* 封面图 + 播放按钮 - 未开始时显示 */}
      {!hasStarted && (
        <button
          data-video-play-button="true"
          onClick={handleStartPlay}
          className="absolute inset-0 z-10 flex items-center justify-center"
          style={{
            backgroundImage: video.thumbnail_url ? `url(${video.thumbnail_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#1a1a1a',
          }}
        >
          {/* 半透明遮罩 */}
          <div className="absolute inset-0 bg-black/40" />

          {/* 播放按钮 - 呼吸感动画 */}
          <div className="relative">
            {/* 外圈脉冲光晕 */}
            <div className="absolute inset-0 rounded-full bg-[#B4F416] opacity-30 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="absolute inset-0 rounded-full bg-[#B4F416] opacity-20 animate-pulse scale-125" style={{ animationDuration: '2s' }} />

            {/* 主按钮 */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#B4F416] border-[3px] border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-center hover:scale-110 hover:shadow-[6px_6px_0px_0px_#000] transition-all duration-300">
              {/* 内圈光晕 */}
              <div className="absolute inset-2 rounded-full bg-white/20 animate-pulse" style={{ animationDuration: '1.5s' }} />
              <Play className="relative w-10 h-10 sm:w-12 sm:h-12 text-black ml-1" fill="currentColor" />
            </div>
          </div>
        </button>
      )}

      {/* 加载指示器 */}
      {isLoading && hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* 播放按钮覆盖层 - 暂停时显示 */}
      {hasStarted && !isPlaying && !isLoading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 z-20"
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-8 h-8 text-black ml-1" />
          </div>
        </button>
      )}

      {/* 控制栏 */}
      {hasStarted && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity z-30',
            showControls ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* 进度条 */}
          <div className="mb-3">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={(value) => seek(value[0])}
              className="cursor-pointer"
            />
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/20">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
                <div className="w-20 hidden sm:block">
                  <Slider value={[isMuted ? 0 : volume]} max={1} step={0.01} onValueChange={handleVolumeChange} />
                </div>
              </div>

              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 gap-1">
                    <Gauge className="w-4 h-4" />
                    <span className="text-sm">{playbackSpeed}x</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {SPEED_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleSpeedChange(option.value)}
                      className={cn(playbackSpeed === option.value && 'bg-primary text-primary-foreground')}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
