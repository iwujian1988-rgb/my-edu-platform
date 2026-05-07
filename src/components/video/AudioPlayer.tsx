'use client'

/**
 * 音频播放器（Apple Music 风格动态模糊背景）
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Play, Pause, Volume2, VolumeX, Headphones, SkipBack, SkipForward } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AudioCoverBackground } from '@/components/video/AudioCoverBackground'
import type { Video } from '@/types/video'

const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
]
const SKIP_SECONDS = 10

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
  audioRefOut?: React.MutableRefObject<HTMLAudioElement | null>
  fallbackImageUrl?: string
}

export function AudioPlayer({
  video, onTimeUpdate, onEnded, initialPosition = 0,
  seekTo, seekTrigger, segmentEndTime, pause,
  autoPlay = false, className, audioRefOut, fallbackImageUrl,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(video.duration || 0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekingValue, setSeekingValue] = useState(0)
  const shouldAutoPlayRef = useRef(false)
  const pendingSeekRef = useRef<number | null>(null)
  const seekGenRef = useRef(0)
  const [audioSrc, setAudioSrc] = useState(video.video_url)
  const coverImageUrl = video.cover_url || video.thumbnail_url || fallbackImageUrl

  // ── iOS 精确 seek：后台下载音频到内存，切换为 Blob URL ──
  // iOS 的 <audio> currentTime seek 在远程音频上有数秒偏差，
  // 将音频下载到本地后 currentTime 即时且准确。
  const isIOSRef = useRef(false)
  const isBlobReadyRef = useRef(false)
  const blobUrlRef = useRef<string | null>(null)

  // 检测 iOS（只执行一次）
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    isIOSRef.current = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }, [])

  // iOS：后台通过代理 API 下载音频为 Blob，绕过 CORS 限制
  // Blob 在内存中，seek 精确到毫秒级，彻底解决 iOS 远程音频 seek 偏差
  useEffect(() => {
    if (!isIOSRef.current || !hasStarted) return
    if (isBlobReadyRef.current) return

    const controller = new AbortController()

    // 通过服务端代理下载，避免跨域 fetch 被拦截
    const proxyUrl = `/api/proxy-audio?url=${encodeURIComponent(video.video_url)}`

    fetch(proxyUrl, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`proxy ${res.status}`)
        return res.blob()
      })
      .then(blob => {
        if (controller.signal.aborted) return
        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url
        isBlobReadyRef.current = true

        // 无缝切换：记住当前位置和播放状态
        const el = audioRef.current
        if (!el) return
        const savedTime = el.currentTime
        const wasPlaying = !el.paused

        // 保留已有的 pending seek（字幕点击可能刚设置了它）
        if (pendingSeekRef.current === null) {
          pendingSeekRef.current = savedTime
        }
        shouldAutoPlayRef.current = wasPlaying || shouldAutoPlayRef.current
        setAudioSrc(url)
      })
      .catch(() => { /* Blob 下载失败，保持远程 URL，seek 时走 Media Fragment 兜底 */ })

    return () => {
      controller.abort()
    }
  }, [hasStarted, video.video_url])

  // 组件卸载时释放 Blob URL
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  // 设置 Media Session 元数据（iOS 锁屏播放器、Android 通知栏）
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: video.title,
      artist: video.creator_name || '未知作者',
      album: 'MaxTube',
      artwork: coverImageUrl
        ? [{ src: coverImageUrl, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    })
  }, [video.title, video.creator_name, coverImageUrl])

  // autoPlay: 联播模式下自动开始播放，只设状态，由 hasStarted effect 统一 load
  useEffect(() => {
    if (!autoPlay || hasStarted) return
    setHasStarted(true); setIsLoading(true); shouldAutoPlayRef.current = true
  }, [autoPlay, hasStarted])

  const handleSpeedChange = useCallback((speed: number) => {
    const el = audioRef.current
    if (!el) return
    el.playbackRate = speed
    setPlaybackSpeed(speed)
  }, [])

  const handleStartPlay = useCallback(async () => {
    setHasStarted(true); setIsLoading(true); shouldAutoPlayRef.current = true
    const el = audioRef.current
    if (el) {
      el.load()
      await new Promise(r => setTimeout(r, 100))
      try { await el.play(); shouldAutoPlayRef.current = false } catch { /* handleCanPlay retries */ }
    }
  }, [])

  useEffect(() => {
    if (!hasStarted) return
    const el = audioRef.current
    if (!el) return
    if (initialPosition > 0) el.currentTime = initialPosition
    el.load()
  }, [hasStarted, initialPosition])

  // 外部控制：跳转到指定时间
  // PC/Android / iOS Blob 已就绪: currentTime 即时 seek
  // iOS Blob 未就绪: Media Fragment 兜底（#t= 强制浏览器从目标位置重新建流）
  useEffect(() => {
    if (seekTo === undefined || seekTo < 0) return
    const el = audioRef.current; if (!el) return
    if (!hasStarted) { setHasStarted(true); setIsLoading(true); pendingSeekRef.current = seekTo; return }

    if (isIOSRef.current && !isBlobReadyRef.current) {
      // iOS Blob 还没下载好：用 Media Fragment 兜底
      setIsLoading(true)
      shouldAutoPlayRef.current = true
      const baseUrl = video.video_url.split('#')[0]
      setAudioSrc(baseUrl + '#t=' + seekTo)
    } else {
      // PC/Android 或 iOS Blob 已就绪：currentTime 即时 seek
      el.currentTime = seekTo
      if (el.paused) el.play().catch(() => {})
    }
  }, [seekTo, seekTrigger, hasStarted, video.video_url])

  useEffect(() => {
    if (!pause) return
    const el = audioRef.current
    if (el && !el.paused) { el.pause(); setIsPlaying(false) }
  }, [pause])

  const handleCanPlay = useCallback(() => {
    const el = audioRef.current; if (!el) return
    setIsLoading(false)
    // media fragment seek 后自动播放（或首次加载自动播放）
    if (shouldAutoPlayRef.current) { shouldAutoPlayRef.current = false; el.play().catch(() => { el.muted = true; el.play().catch(() => {}) }) }
    // 首次播放的 pending seek（hasStarted=false 时的延迟跳转）
    if (pendingSeekRef.current !== null) {
      const targetTime = pendingSeekRef.current
      pendingSeekRef.current = null
      el.currentTime = targetTime
    }
  }, [])

  const togglePlay = useCallback(async () => {
    const el = audioRef.current; if (!el) return
    try { isPlaying ? el.pause() : await el.play() } catch (e) { console.error('[AudioPlayer]', e) }
  }, [isPlaying])

  const seek = useCallback((t: number) => {
    const el = audioRef.current; if (!el) return
    el.currentTime = Math.max(0, Math.min(t, duration))
  }, [duration])

  // Media Session 播放控制（锁屏/通知栏按钮）
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play()
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      const el = audioRef.current
      if (el && !el.paused) { el.pause(); setIsPlaying(false) }
    })
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      seek(currentTime - SKIP_SECONDS)
    })
    navigator.mediaSession.setActionHandler('seekforward', () => {
      seek(currentTime + SKIP_SECONDS)
    })
  }, [currentTime, seek])

  const handleVolumeChange = useCallback((v: number[]) => {
    const el = audioRef.current; if (!el) return
    el.volume = v[0]; setVolume(v[0]); setIsMuted(v[0] === 0)
  }, [])

  const toggleMute = useCallback(() => {
    const el = audioRef.current; if (!el) return
    el.muted = !isMuted; setIsMuted(!isMuted)
  }, [isMuted])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(Math.floor(s % 60)).toString().padStart(2, '0')}`

  const handleLoadedMetadata = () => {
    const el = audioRef.current; if (!el) return
    setDuration(el.duration || video.duration)
    if (initialPosition > 0) el.currentTime = initialPosition
  }
  const handleTimeUpdate = () => {
    const el = audioRef.current; if (!el || isSeeking) return
    setCurrentTime(el.currentTime); onTimeUpdate?.(el.currentTime)
    if (segmentEndTime !== undefined && segmentEndTime > 0 && el.currentTime + 0.1 >= segmentEndTime)
      { el.pause(); setIsPlaying(false) }
  }

  return (
    <div ref={containerRef} className={cn('relative z-0 overflow-hidden select-none aspect-video', className)} style={{ backgroundColor: '#111' }}>
      <audio
        ref={el => { (audioRef as React.MutableRefObject<HTMLAudioElement | null>).current = el; if (audioRefOut) audioRefOut.current = el }}
        src={audioSrc} preload="auto"
        onLoadedMetadata={handleLoadedMetadata} onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate} onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)} onEnded={() => { setIsPlaying(false); onEnded?.() }}
        onWaiting={() => setIsLoading(true)}
      />

      {/* ===== Apple Music 风格动态模糊背景 ===== */}
      <AudioCoverBackground imageUrl={coverImageUrl} darkenBottom />

      {/* ===== 未播放：封面 + 播放按钮 ===== */}
      {!hasStarted && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-end gap-4 sm:gap-6 pb-6 sm:pb-10 sm:justify-center">
          <div className="relative">
            <div className="w-24 h-24 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-2xl shadow-2xl overflow-hidden border border-white/10"
              style={{ backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#222' }}>
              {!coverImageUrl && <div className="w-full h-full flex items-center justify-center"><Headphones className="w-10 h-10 sm:w-16 sm:h-16 text-white/20" /></div>}
            </div>
            <button data-audio-play-button="true" onClick={handleStartPlay}
              className="absolute -bottom-3 -right-3 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#B4F416] flex items-center justify-center shadow-lg">
              <Play className="w-6 h-6 sm:w-7 sm:h-7 text-black ml-0.5" fill="currentColor" />
            </button>
          </div>
          <div className="text-center px-8 max-w-sm">
            <h3 className="text-white font-bold text-base truncate">{video.title}</h3>
            <p className="text-white/40 text-xs mt-1">{video.creator_name || '未知作者'}</p>
          </div>
        </div>
      )}

      {/* ===== 播放中：播客沉浸式 ===== */}
      {hasStarted && (
        <div className="relative z-10 w-full h-full flex flex-col">
          {/* 速率按钮 - 整个播放器右上角 */}
          <div className="absolute top-3 right-3 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-white/60 hover:text-white transition-colors text-xs font-bold px-2 py-1 rounded border border-white/10 bg-black/20 backdrop-blur-sm">{playbackSpeed}x</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border border-white/10">
                {SPEED_OPTIONS.map(o => (
                  <DropdownMenuItem key={o.value} onClick={() => handleSpeedChange(o.value)}
                    className={cn("cursor-pointer font-bold text-white/70", playbackSpeed === o.value ? 'bg-[#B4F416] text-black' : 'hover:bg-white/10')}>
                    {o.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-2 sm:pt-4 pb-1 sm:pb-2 min-h-0 overflow-hidden">
            {/* 封面：aspect-square 但 max-h 限制不超过容器可用空间 */}
            <div className={cn(
              "rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 transition-all duration-700 ease-out",
              "w-20 h-20 sm:w-48 sm:h-48 md:w-56 md:h-56",
              isPlaying ? "scale-100 shadow-[0_8px_40px_rgba(0,0,0,0.5)]" : "scale-[0.96] shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
            )} style={{
              backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined,
              backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#222',
            }}>
              {!coverImageUrl && <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900"><Headphones className="w-6 h-6 sm:w-12 sm:h-12 text-white/20" /></div>}
            </div>
            <h3 className="text-white font-bold text-xs sm:text-sm text-center mt-2 sm:mt-3 truncate max-w-full drop-shadow-lg">{video.title}</h3>
            <p className="text-white/50 text-[10px] sm:text-xs mt-0.5 drop-shadow">{video.creator_name || '未知作者'}</p>
          </div>

          {/* 控制区 */}
          <div className="flex-shrink-0 px-4 sm:px-6 pb-4 sm:pb-5 pt-2">

            <div className="w-full mb-3">
              <Slider value={[isSeeking ? seekingValue : currentTime]} max={duration || 1} step={0.1}
                onPointerDown={() => { setIsSeeking(true); setSeekingValue(currentTime) }}
                onValueChange={v => { if (isSeeking) setSeekingValue(v[0]) }}
                onPointerUp={() => { if (isSeeking) { seek(seekingValue); setCurrentTime(seekingValue); setIsSeeking(false) } }}
                className="cursor-pointer [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-md [&_.relative]:h-1 [&>span:first-child]:h-1 [&>span:first-child]:bg-white/20 [&>span:last-child]:bg-white/80"
              />
              <div className="flex justify-between mt-1">
                <span className="text-white/50 text-[10px] font-mono">{formatTime(isSeeking ? seekingValue : currentTime)}</span>
                <span className="text-white/50 text-[10px] font-mono">{formatTime(duration)}</span>
              </div>
            </div>
            {/* 移动端：三个按钮横向均布；PC端：原始布局 */}
            <div className="flex items-center justify-around sm:justify-between">
              <button onClick={() => seek(currentTime - SKIP_SECONDS)} className="text-white/60 hover:text-white transition-colors p-2 sm:p-1"><SkipBack className="w-5 h-5" /></button>
              <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : isPlaying ? <Pause className="w-6 h-6 text-white" fill="currentColor" />
                  : <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />}
              </button>
              <button onClick={() => seek(currentTime + SKIP_SECONDS)} className="text-white/60 hover:text-white transition-colors p-2 sm:p-1"><SkipForward className="w-5 h-5" /></button>
              <div className="hidden sm:flex items-center gap-1">
                <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors p-1">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div className="w-16">
                  <Slider value={[isMuted ? 0 : volume]} max={1} step={0.01} onValueChange={handleVolumeChange}
                    className="[&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_.relative]:h-0.5 [&>span:first-child]:h-0.5 [&>span:first-child]:bg-white/20 [&>span:last-child]:bg-white/60" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
