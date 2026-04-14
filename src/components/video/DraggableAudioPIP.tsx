'use client'

/**
 * 音频博客 PIP（画中画）组件
 *
 * 基于 DraggablePIP 简化版：
 * - 横条形布局：封面小图 + 播放/暂停 + 进度条 + 时间 + 展开按钮
 * - 共享同一个 <audio> DOM 元素（appendChild 方式，零缓冲延迟）
 * - 支持拖拽、边缘吸附
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Play, Pause, Maximize } from 'lucide-react'
import type { Video } from '@/types/video'

const PIP_WIDTH = 260
const PIP_HEIGHT = 64
const PIP_MARGIN = 12
const SNAP_THRESHOLD = 50
const DRAG_THRESHOLD = 5

interface DraggableAudioPIPProps {
  video: Video
  /** 共享的 <audio> DOM 元素 */
  audioElement: HTMLAudioElement | null
  isPlaying: boolean
  currentTime: number
  duration: number
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onExpand: () => void
  className?: string
  /** 封面为空时的兜底图片（如 UP主头像） */
  fallbackImageUrl?: string
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface Position {
  x: number
  y: number
}

export function DraggableAudioPIP({
  video,
  audioElement,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  onExpand,
  className,
  fallbackImageUrl,
}: DraggableAudioPIPProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const audioSlotRef = useRef<HTMLDivElement>(null)
  const originalParentRef = useRef<HTMLElement | null>(null)
  const originalNextSiblingRef = useRef<Node | null>(null)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const dragStartRef = useRef<Position | null>(null)
  const positionStartRef = useRef<Position | null>(null)
  const rafRef = useRef<number | null>(null)
  const [snappedCorner, setSnappedCorner] = useState<Corner>('bottom-right')
  const trackRef = useRef<HTMLDivElement>(null)
  const [seekingPercent, setSeekingPercent] = useState<number | null>(null)

  // 共享 <audio> 元素：挂载时移入 PIP，卸载时还原
  useEffect(() => {
    if (!audioElement || !audioSlotRef.current) return

    // 保存原始位置
    originalParentRef.current = audioElement.parentElement
    originalNextSiblingRef.current = audioElement.nextSibling

    // 保存播放状态
    const wasPlaying = !audioElement.paused
    const currentTime = audioElement.currentTime

    // 修改样式：保持交互能力但视觉隐藏
    audioElement.style.width = '1px'
    audioElement.style.height = '1px'
    audioElement.style.position = 'absolute'
    audioElement.style.opacity = '0'
    audioElement.style.pointerEvents = 'auto' // 保持交互能力

    // 先暂停避免移动时的冲突
    audioElement.pause()

    // 移动元素到 PIP 容器
    audioSlotRef.current.appendChild(audioElement)

    // 恢复播放状态和时间位置
    audioElement.currentTime = currentTime
    if (wasPlaying) {
      audioElement.play().catch((err) => {
        console.warn('[DraggableAudioPIP] Failed to resume playback after move:', err)
      })
    }

    console.log('[DraggableAudioPIP] Audio element moved to PIP, wasPlaying:', wasPlaying)

    return () => {
      const parent = originalParentRef.current
      if (parent && audioElement.parentElement !== parent) {
        // 保存播放状态
        const wasPlaying = !audioElement.paused
        const currentTime = audioElement.currentTime

        // 先暂停
        audioElement.pause()

        // 移回原位置
        const nextSibling = originalNextSiblingRef.current
        if (nextSibling && nextSibling.parentNode === parent) {
          parent.insertBefore(audioElement, nextSibling)
        } else {
          parent.appendChild(audioElement)
        }

        // 恢复播放状态
        audioElement.currentTime = currentTime
        if (wasPlaying) {
          audioElement.play().catch((err) => {
            console.warn('[DraggableAudioPIP] Failed to resume playback after restore:', err)
          })
        }

        console.log('[DraggableAudioPIP] Audio element restored to original position, wasPlaying:', wasPlaying)
      }

      // 清理样式
      audioElement.style.width = ''
      audioElement.style.height = ''
      audioElement.style.position = ''
      audioElement.style.opacity = ''
      audioElement.style.pointerEvents = ''
    }
  }, [audioElement])

  // 初始化位置（底部居中偏右）
  useEffect(() => {
    const initPosition = () => {
      if (typeof window === 'undefined') return
      const pipWidth = Math.min(PIP_WIDTH, window.innerWidth - PIP_MARGIN * 2)
      setPosition({
        x: window.innerWidth - pipWidth - PIP_MARGIN,
        y: window.innerHeight - PIP_HEIGHT - PIP_MARGIN - 80,
      })
    }
    initPosition()
    window.addEventListener('resize', initPosition)
    return () => window.removeEventListener('resize', initPosition)
  }, [])

  const getNearestCorner = useCallback((x: number, y: number): Corner => {
    if (typeof window === 'undefined') return 'bottom-right'
    const pipWidth = Math.min(PIP_WIDTH, window.innerWidth - PIP_MARGIN * 2)
    const centerX = x + pipWidth / 2
    const centerY = y + PIP_HEIGHT / 2
    const windowCenterX = window.innerWidth / 2
    const windowCenterY = window.innerHeight / 2

    if (centerX < windowCenterX && centerY < windowCenterY) return 'top-left'
    if (centerX >= windowCenterX && centerY < windowCenterY) return 'top-right'
    if (centerX < windowCenterX && centerY >= windowCenterY) return 'bottom-left'
    return 'bottom-right'
  }, [])

  const getSnapPosition = useCallback((corner: Corner): Position => {
    if (typeof window === 'undefined') return { x: 0, y: 0 }
    const pipWidth = Math.min(PIP_WIDTH, window.innerWidth - PIP_MARGIN * 2)
    const safeAreaBottom = 80

    switch (corner) {
      case 'top-left':
        return { x: PIP_MARGIN, y: PIP_MARGIN }
      case 'top-right':
        return { x: window.innerWidth - pipWidth - PIP_MARGIN, y: PIP_MARGIN }
      case 'bottom-left':
        return { x: PIP_MARGIN, y: window.innerHeight - PIP_HEIGHT - PIP_MARGIN - safeAreaBottom }
      case 'bottom-right':
      default:
        return { x: window.innerWidth - pipWidth - PIP_MARGIN, y: window.innerHeight - PIP_HEIGHT - PIP_MARGIN - safeAreaBottom }
    }
  }, [])

  const clampPosition = useCallback((x: number, y: number): Position => {
    if (typeof window === 'undefined') return { x, y }
    const pipWidth = Math.min(PIP_WIDTH, window.innerWidth - PIP_MARGIN * 2)
    const safeAreaBottom = 80
    return {
      x: Math.max(0, Math.min(x, window.innerWidth - pipWidth)),
      y: Math.max(0, Math.min(y, window.innerHeight - PIP_HEIGHT - safeAreaBottom)),
    }
  }, [])

  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragStartRef.current = { x: clientX, y: clientY }
    positionStartRef.current = position
    setHasDragged(false)
    setIsDragging(true)
  }, [position])

  const handleDragMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!dragStartRef.current || !positionStartRef.current) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const deltaX = clientX - dragStartRef.current.x
    const deltaY = clientY - dragStartRef.current.y

    if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
      setHasDragged(true)
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const newX = positionStartRef.current!.x + deltaX
      const newY = positionStartRef.current!.y + deltaY
      setPosition(clampPosition(newX, newY))
    })
  }, [clampPosition])

  const handleDragEnd = useCallback(() => {
    if (!hasDragged) {
      setIsDragging(false)
      onExpand()
      return
    }
    const corner = getNearestCorner(position.x, position.y)
    setPosition(getSnapPosition(corner))
    setSnappedCorner(corner)
    setIsDragging(false)
    dragStartRef.current = null
    positionStartRef.current = null
  }, [hasDragged, position, getNearestCorner, getSnapPosition, onExpand])

  useEffect(() => {
    if (!isDragging) return
    const handleMove = (e: TouchEvent | MouseEvent) => handleDragMove(e)
    const handleEnd = () => handleDragEnd()

    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)

    return () => {
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercent = seekingPercent ?? (duration > 0 ? (currentTime / duration) * 100 : 0)

  const calcPercent = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
  }, [])

  const handleTrackMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setSeekingPercent(calcPercent(e.clientX))

    const handleMove = (ev: MouseEvent) => {
      ev.preventDefault()
      setSeekingPercent(calcPercent(ev.clientX))
    }
    const handleUp = (ev: MouseEvent) => {
      const finalPct = calcPercent(ev.clientX)
      if (duration > 0) onSeek((finalPct / 100) * duration)
      setSeekingPercent(null)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [calcPercent, duration, onSeek])

  const coverUrl = video.cover_url || video.thumbnail_url || fallbackImageUrl

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className={cn(
          'fixed z-[100] rounded-xl overflow-hidden',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
          className
        )}
        style={{
          height: PIP_HEIGHT,
          width: Math.min(PIP_WIDTH, typeof window !== 'undefined' ? window.innerWidth - PIP_MARGIN * 2 : PIP_WIDTH),
          left: position.x,
          top: position.y,
          touchAction: 'none',
          backgroundColor: '#111',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        {/* 模糊背景 */}
        {coverUrl && (
          <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scale(1.4)', filter: 'blur(40px) saturate(2) brightness(0.5) contrast(1.1)' }} />
        )}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        {/* 隐藏的 audio 元素插槽 */}
        <div ref={audioSlotRef} className="hidden" />

        {/* ===== 横排布局：封面 + 标题/进度 + 播放 + 展开 ===== */}
        <div className="relative z-10 flex items-center h-full px-2 gap-2">
          {/* 封面小图 */}
          <div
            className="w-10 h-10 rounded-lg flex-shrink-0 border border-white/10"
            style={{
              backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#333',
            }}
          />

          {/* 标题 + 进度条 */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <p className="text-white font-bold text-[11px] truncate drop-shadow">{video.title}</p>
            <div
              ref={trackRef}
              className="relative h-1 bg-white/20 cursor-pointer rounded-full"
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={handleTrackMouseDown}
            >
              <div className="h-full bg-[#B4F416] rounded-full" style={{ width: `${progressPercent}%` }} />
              <div className="absolute -top-1 -bottom-1 left-0 right-0" />
            </div>
            <div className="flex justify-between">
              <span className="text-white/50 text-[8px] font-mono">{formatTime(currentTime)}</span>
              <span className="text-white/50 text-[8px] font-mono">{formatTime(duration)}</span>
            </div>
          </div>

          {/* 播放/暂停 */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onTogglePlay() }}
            className="p-2 text-white hover:text-[#B4F416] transition-colors flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* 展开 */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onExpand() }}
            className="p-1.5 text-white/50 hover:text-white transition-colors flex-shrink-0"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 拖动指示器 */}
        {isDragging && (
          <div className="absolute inset-0 border-2 border-[#B4F416] rounded-xl pointer-events-none" />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
