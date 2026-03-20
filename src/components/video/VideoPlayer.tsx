'use client'

/**
 * 视频播放器组件
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 2.1
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0
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

// 播放速度选项（PRD 2.1 要求）
const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
]

// 控制栏自动隐藏延迟（毫秒）
const HIDE_CONTROLS_DELAY_MS = 3000

interface VideoPlayerProps {
  video: Video
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
  initialPosition?: number
  autoPlay?: boolean
  className?: string
}

export function VideoPlayer({
  video,
  onTimeUpdate,
  onEnded,
  initialPosition = 0,
  autoPlay = false,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  // 控制栏自动隐藏
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null)

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

  // 播放速度切换
  const handleSpeedChange = useCallback((speed: number) => {
    const videoEl = videoRef.current
    if (!videoEl) return

    videoEl.playbackRate = speed
    setPlaybackSpeed(speed)
  }, [])

  // 初始化
  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl) return

    // 设置初始位置
    if (initialPosition > 0) {
      videoEl.currentTime = initialPosition
    }

    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current)
      }
    }
  }, [initialPosition])

  // 播放/暂停
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

  // 跳转
  const seek = useCallback((time: number) => {
    const videoEl = videoRef.current
    if (!videoEl) return

    videoEl.currentTime = Math.max(0, Math.min(time, duration))
  }, [duration])

  // 音量控制
  const handleVolumeChange = useCallback((value: number[]) => {
    const videoEl = videoRef.current
    if (!videoEl) return

    const newVolume = value[0]
    videoEl.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }, [])

  // 静音切换
  const toggleMute = useCallback(() => {
    const videoEl = videoRef.current
    if (!videoEl) return

    videoEl.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])

  // 全屏切换
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

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 视频事件处理
  const handleLoadedMetadata = () => {
    const videoEl = videoRef.current
    if (!videoEl) return

    setDuration(videoEl.duration)
    setIsLoading(false)

    if (autoPlay) {
      videoEl.play().catch(() => {})
    }
  }

  const handleTimeUpdate = () => {
    const videoEl = videoRef.current
    if (!videoEl) return

    setCurrentTime(videoEl.currentTime)
    onTimeUpdate?.(videoEl.currentTime)
  }

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleEnded = () => {
    setIsPlaying(false)
    onEnded?.()
  }

  const handleWaiting = () => setIsLoading(true)
  const handleCanPlay = () => setIsLoading(false)

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black rounded-lg overflow-hidden group',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* 视频元素 */}
      <video
        ref={videoRef}
        src={video.video_url}
        poster={video.thumbnail_url || undefined}
        className="w-full aspect-video"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onClick={togglePlay}
      />

      {/* 加载指示器 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* 播放按钮覆盖层 */}
      {!isPlaying && !isLoading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-8 h-8 text-black ml-1" />
          </div>
        </button>
      )}

      {/* 控制栏 */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity',
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
            {/* 播放/暂停 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>

            {/* 音量 */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>

              <div className="w-20 hidden sm:block">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                />
              </div>
            </div>

            {/* 时间 */}
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 播放速度 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 gap-1"
                >
                  <Gauge className="w-4 h-4" />
                  <span className="text-sm">{playbackSpeed}x</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {SPEED_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => handleSpeedChange(option.value)}
                    className={cn(
                      playbackSpeed === option.value && 'bg-primary text-primary-foreground'
                    )}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 全屏 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
