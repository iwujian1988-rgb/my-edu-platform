'use client'

/**
 * 音频播放器组件（音频博客）
 *
 * 与 VideoPlayer 接口对齐，使用 <audio> 替代 <video>。
 * 布局：封面图（方形） + 波形进度条 + 控制栏。
 * 无全屏按钮，支持 PIP 模式（暴露 audioRefOut）。
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Play, Pause, Volume2, VolumeX, Gauge, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Video } from '@/types/video'
import { extractPeaks } from '@/components/video/AudioPlayerWaveform'

const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
]

const HIDE_CONTROLS_DELAY_MS = 3000
const WAVEFORM_BAR_COUNT = 80
const WAVEFORM_BAR_GAP = 1.5
const WAVEFORM_BAR_MIN_HEIGHT = 2

interface AudioPlayerProps {
  video: Video
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
  initialPosition?: number
  seekTo?: number
  seekTrigger?: number
  segmentEndTime?: number
  pause?: boolean
  autoPlay?: boolean
  className?: string
  /** 暴露 <audio> 元素 ref，供 PIP 模式共享 */
  audioRefOut?: React.MutableRefObject<HTMLAudioElement | null>
}

export function AudioPlayer({
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
  audioRefOut,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [hasStarted, setHasStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(video.duration || 0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const shouldAutoPlayRef = useRef(false)
  const pendingSeekRef = useRef<number | null>(null)
  const seekingValueRef = useRef<number | null>(null)
  const [seekingDisplay, setSeekingDisplay] = useState<number | null>(null)

  // 波形数据
  const [peaks, setPeaks] = useState<number[] | null>(null)

  // 提取波形数据（audioSrc 存在时）
  useEffect(() => {
    if (!video.video_url) return
    let cancelled = false
    extractPeaks(video.video_url, WAVEFORM_BAR_COUNT)
      .then((extractedPeaks) => {
        if (!cancelled) setPeaks(extractedPeaks)
      })
      .catch(() => {
        // 生成占位波形
        if (!cancelled) {
          const placeholder: number[] = []
          for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
            const t = i / WAVEFORM_BAR_COUNT
            const v = 0.2 + 0.3 * Math.sin(t * Math.PI * 4) + 0.1 * Math.sin(t * Math.PI * 9)
            placeholder.push(Math.max(0.08, Math.min(v, 0.9)))
          }
          setPeaks(placeholder)
        }
      })
    return () => { cancelled = true }
  }, [video.video_url])

  // 绘制波形
  const drawWaveform = useCallback((progress: number) => {
    const canvas = waveformCanvasRef.current
    if (!canvas || !peaks) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const displayWidth = canvas.clientWidth
    const displayHeight = canvas.clientHeight
    canvas.width = displayWidth * dpr
    canvas.height = displayHeight * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, displayWidth, displayHeight)

    const barCount = peaks.length
    const totalGap = (barCount - 1) * WAVEFORM_BAR_GAP
    const barWidth = Math.max(1, (displayWidth - totalGap) / barCount)
    const playedIndex = Math.floor(progress * barCount)

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + WAVEFORM_BAR_GAP)
      const normalizedHeight = peaks[i] * (displayHeight - 4)
      const barHeight = Math.max(WAVEFORM_BAR_MIN_HEIGHT, normalizedHeight)
      const y = (displayHeight - barHeight) / 2

      ctx.fillStyle = i < playedIndex ? '#B4F416' : 'rgba(255, 255, 255, 0.3)'
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, 1)
      ctx.fill()
    }
  }, [peaks])

  // 波形重绘（进度变化时）
  useEffect(() => {
    if (duration > 0) {
      drawWaveform(currentTime / duration)
    }
  }, [currentTime, duration, drawWaveform])

  // 初始加载时也绘制一次
  useEffect(() => {
    if (peaks) drawWaveform(0)
  }, [peaks, drawWaveform])

  const handleSpeedChange = useCallback((speed: number) => {
    const audioEl = audioRef.current
    if (!audioEl) return
    audioEl.playbackRate = speed
    setPlaybackSpeed(speed)
  }, [])

  // 点击封面开始播放
  const handleStartPlay = useCallback(async () => {
    setHasStarted(true)
    setIsLoading(true)
    shouldAutoPlayRef.current = true

    const audioEl = audioRef.current
    if (audioEl) {
      audioEl.load()
      await new Promise(resolve => setTimeout(resolve, 100))
      try {
        await audioEl.play()
        shouldAutoPlayRef.current = false
      } catch {
        // 等待 handleCanPlay 重试
      }
    }
  }, [])

  // 设置初始位置
  useEffect(() => {
    if (!hasStarted) return
    const audioEl = audioRef.current
    if (!audioEl) return
    if (initialPosition > 0) {
      audioEl.currentTime = initialPosition
    }
    audioEl.load()
  }, [hasStarted, initialPosition])

  // 外部跳转
  useEffect(() => {
    if (seekTo === undefined || seekTo < 0) return
    const audioEl = audioRef.current
    if (!audioEl) return

    if (!hasStarted) {
      setHasStarted(true)
      setIsLoading(true)
      pendingSeekRef.current = seekTo
      return
    }

    audioEl.currentTime = seekTo
    if (audioEl.paused) {
      audioEl.play().catch(() => {})
    }
  }, [seekTo, seekTrigger, hasStarted])

  // 外部暂停
  useEffect(() => {
    if (!pause) return
    const audioEl = audioRef.current
    if (audioEl && !audioEl.paused) {
      audioEl.pause()
      setIsPlaying(false)
    }
  }, [pause])

  const handleCanPlay = useCallback(() => {
    const audioEl = audioRef.current
    if (!audioEl) return

    setIsLoading(false)

    if (shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false
      audioEl.play().catch(() => {})
    }

    if (pendingSeekRef.current !== null) {
      audioEl.currentTime = pendingSeekRef.current
      pendingSeekRef.current = null
      audioEl.play().catch(() => {})
    }
  }, [])

  const togglePlay = useCallback(async () => {
    const audioEl = audioRef.current
    if (!audioEl) return
    try {
      if (isPlaying) {
        audioEl.pause()
      } else {
        await audioEl.play()
      }
    } catch (error) {
      console.error('[AudioPlayer] Play error:', error)
    }
  }, [isPlaying])

  const seek = useCallback((time: number) => {
    const audioEl = audioRef.current
    if (!audioEl) return
    audioEl.currentTime = Math.max(0, Math.min(time, duration))
  }, [duration])

  const handleVolumeChange = useCallback((value: number[]) => {
    const audioEl = audioRef.current
    if (!audioEl) return
    const newVolume = value[0]
    audioEl.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }, [])

  const toggleMute = useCallback(() => {
    const audioEl = audioRef.current
    if (!audioEl) return
    audioEl.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleLoadedMetadata = () => {
    const audioEl = audioRef.current
    if (!audioEl) return
    setDuration(audioEl.duration || video.duration)
    if (initialPosition > 0) {
      audioEl.currentTime = initialPosition
    }
  }

  const handleTimeUpdate = () => {
    const audioEl = audioRef.current
    if (!audioEl) return
    if (seekingValueRef.current !== null) return
    setCurrentTime(audioEl.currentTime)
    onTimeUpdate?.(audioEl.currentTime)

    if (segmentEndTime !== undefined && segmentEndTime > 0) {
      if (audioEl.currentTime + 0.1 >= segmentEndTime) {
        audioEl.pause()
        setIsPlaying(false)
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

  const coverImageUrl = video.cover_url || video.thumbnail_url

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black overflow-hidden',
        className
      )}
    >
      {/* 音频元素 */}
      <audio
        ref={(el) => {
          (audioRef as React.MutableRefObject<HTMLAudioElement | null>).current = el
          if (audioRefOut) audioRefOut.current = el
        }}
        src={hasStarted ? video.video_url : undefined}
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
      />

      {/* 封面图 + 播放按钮（未开始时显示） */}
      {!hasStarted && (
        <button
          data-audio-play-button="true"
          onClick={handleStartPlay}
          className="w-full aspect-square flex items-center justify-center relative"
          style={{
            backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#1a1a1a',
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative flex flex-col items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#B4F416] opacity-30 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#B4F416] border-[3px] border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-center hover:scale-110 hover:shadow-[6px_6px_0px_0px_#000] transition-all duration-300">
                <Play className="relative w-10 h-10 sm:w-12 sm:h-12 text-black ml-1" fill="currentColor" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Headphones className="w-4 h-4" />
              <span className="text-sm font-bold">音频博客</span>
            </div>
          </div>
        </button>
      )}

      {/* 播放中界面 */}
      {hasStarted && (
        <div className="w-full p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-gradient-to-b from-gray-900 to-black min-h-[200px]">
          {/* 封面小图 */}
          <div
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg flex-shrink-0 border-2 border-white/10"
            style={{
              backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#333',
            }}
          >
            {!coverImageUrl && (
              <div className="w-full h-full flex items-center justify-center">
                <Headphones className="w-10 h-10 text-white/30" />
              </div>
            )}
          </div>

          {/* 右侧控制区 */}
          <div className="flex-1 w-full space-y-3">
            {/* 标题信息 */}
            <div>
              <h3 className="text-white font-bold text-sm sm:text-base truncate">{video.title}</h3>
              <p className="text-white/40 text-xs mt-0.5">
                {video.creator_name || '未知作者'}
              </p>
            </div>

            {/* 波形进度条 */}
            <div className="relative h-10 w-full cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const percent = (e.clientX - rect.left) / rect.width
                seek(percent * duration)
                setCurrentTime(percent * duration)
              }}
            >
              <canvas
                ref={waveformCanvasRef}
                className="w-full h-full"
                style={{ display: 'block' }}
              />
            </div>

            {/* 控制栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/20 h-8 w-8">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20 h-8 w-8">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <div className="w-16 hidden sm:block">
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.01}
                      onValueChange={handleVolumeChange}
                      className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-white/50"
                    />
                  </div>
                </div>

                <span className="text-white text-xs font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 gap-1 h-8">
                    <Gauge className="w-3 h-3" />
                    <span className="text-xs">{playbackSpeed}x</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border-2 border-black shadow-[3px_3px_0px_0px_#000]">
                  {SPEED_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleSpeedChange(option.value)}
                      className={cn(
                        "cursor-pointer font-bold",
                        playbackSpeed === option.value ? 'bg-[#B4F416] text-black' : 'text-gray-700 dark:text-gray-200'
                      )}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      {/* 加载指示器 */}
      {isLoading && hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
