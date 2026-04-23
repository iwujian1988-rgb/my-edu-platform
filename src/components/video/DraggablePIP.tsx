'use client'

/**
 * 可拖动画中画 (PIP) 组件
 *
 * 通过 CSS position: fixed 将主视频元素浮到 PIP 位置，
 * 不移动 DOM 节点，避免 Android Chrome 移动 video 元素导致重载。
 *
 * 功能：
 * - 原生 touch 事件处理拖动
 * - RAF 节流优化性能
 * - 边界检测 + 角落吸附动画
 * - 点击展开回全屏
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'
import type { Video } from '@/types/video'

// ============================================
// 常量
// ============================================

const PIP_WIDTH = 208
const PIP_HEIGHT = 117
const PIP_MARGIN = 16
const SNAP_THRESHOLD = 50
const DRAG_THRESHOLD = 5

// ============================================
// 类型定义
// ============================================

interface DraggablePIPProps {
  video: Video
  /** 外部传入的主视频 DOM 元素，通过 CSS fixed 定位到 PIP 位置 */
  videoElement: HTMLVideoElement | null
  isPlaying: boolean
  currentTime: number
  duration: number
  isMuted: boolean
  onTogglePlay: () => void
  onToggleMute: () => void
  onSeek: (time: number) => void
  onExpand: () => void
  onTimeUpdate: (time: number) => void
  className?: string
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface Position {
  x: number
  y: number
}

// ============================================
// 主组件
// ============================================

export function DraggablePIP({
  video,
  videoElement,
  isPlaying,
  currentTime,
  duration,
  isMuted,
  onTogglePlay,
  onToggleMute,
  onSeek,
  onExpand,
  onTimeUpdate,
  className,
}: DraggablePIPProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const dragStartRef = useRef<Position | null>(null)
  const positionStartRef = useRef<Position | null>(null)
  const rafRef = useRef<number | null>(null)
  const [snappedCorner, setSnappedCorner] = useState<Corner>('bottom-right')
  const trackRef = useRef<HTMLDivElement>(null)
  const [seekingPercent, setSeekingPercent] = useState<number | null>(null) // 拖拽中本地视觉进度

  // 通过 CSS position: fixed 将视频元素浮到 PIP 位置（不移动 DOM）
  useEffect(() => {
    if (!videoElement) return

    // 应用 PIP 固定定位样式
    videoElement.style.position = 'fixed'
    videoElement.style.zIndex = '101'
    videoElement.style.pointerEvents = 'none'
    videoElement.style.borderRadius = '8px'
    videoElement.style.border = '2px solid black'
    videoElement.style.boxShadow = '3px 3px 0px 0px #000'

    return () => {
      // 清除所有 PIP 样式
      videoElement.style.position = ''
      videoElement.style.zIndex = ''
      videoElement.style.left = ''
      videoElement.style.top = ''
      videoElement.style.width = ''
      videoElement.style.height = ''
      videoElement.style.objectFit = ''
      videoElement.style.pointerEvents = ''
      videoElement.style.borderRadius = ''
      videoElement.style.border = ''
      videoElement.style.boxShadow = ''
    }
  }, [videoElement])

  // 同步 position 到 video 元素的 CSS（拖动时实时更新）
  useEffect(() => {
    if (!videoElement) return

    videoElement.style.left = `${position.x}px`
    videoElement.style.top = `${position.y}px`
    videoElement.style.width = `${PIP_WIDTH}px`
    videoElement.style.height = `${PIP_HEIGHT}px`
    videoElement.style.objectFit = 'contain'
  }, [videoElement, position.x, position.y])

  // 监听视频元素的 timeupdate 事件，上报进度给父组件
  useEffect(() => {
    if (!videoElement) return

    const handleTimeUpdate = () => {
      onTimeUpdate(videoElement.currentTime)
    }

    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    return () => videoElement.removeEventListener('timeupdate', handleTimeUpdate)
  }, [videoElement, onTimeUpdate])

  // 初始化位置（右下角）
  useEffect(() => {
    const initPosition = () => {
      if (typeof window === 'undefined') return
      const x = window.innerWidth - PIP_WIDTH - PIP_MARGIN
      const y = window.innerHeight - PIP_HEIGHT - PIP_MARGIN - 80
      setPosition({ x, y })
    }
    initPosition()
    window.addEventListener('resize', initPosition)
    return () => window.removeEventListener('resize', initPosition)
  }, [])

  // 计算最近的角落
  const getNearestCorner = useCallback((x: number, y: number): Corner => {
    if (typeof window === 'undefined') return 'bottom-right'

    const centerX = x + PIP_WIDTH / 2
    const centerY = y + PIP_HEIGHT / 2
    const windowCenterX = window.innerWidth / 2
    const windowCenterY = window.innerHeight / 2

    if (centerX < windowCenterX && centerY < windowCenterY) return 'top-left'
    if (centerX >= windowCenterX && centerY < windowCenterY) return 'top-right'
    if (centerX < windowCenterX && centerY >= windowCenterY) return 'bottom-left'
    return 'bottom-right'
  }, [])

  // 计算吸附位置
  const getSnapPosition = useCallback((corner: Corner): Position => {
    if (typeof window === 'undefined') return { x: 0, y: 0 }

    const safeAreaBottom = 80

    switch (corner) {
      case 'top-left':
        return { x: PIP_MARGIN, y: PIP_MARGIN }
      case 'top-right':
        return { x: window.innerWidth - PIP_WIDTH - PIP_MARGIN, y: PIP_MARGIN }
      case 'bottom-left':
        return { x: PIP_MARGIN, y: window.innerHeight - PIP_HEIGHT - PIP_MARGIN - safeAreaBottom }
      case 'bottom-right':
      default:
        return { x: window.innerWidth - PIP_WIDTH - PIP_MARGIN, y: window.innerHeight - PIP_HEIGHT - PIP_MARGIN - safeAreaBottom }
    }
  }, [])

  // 边界约束
  const clampPosition = useCallback((x: number, y: number): Position => {
    if (typeof window === 'undefined') return { x, y }

    const safeAreaBottom = 80

    return {
      x: Math.max(0, Math.min(x, window.innerWidth - PIP_WIDTH)),
      y: Math.max(0, Math.min(y, window.innerHeight - PIP_HEIGHT - safeAreaBottom)),
    }
  }, [])

  // 拖动开始
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

  // 拖动移动（RAF 节流）
  const handleDragMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!dragStartRef.current || !positionStartRef.current) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const deltaX = clientX - dragStartRef.current.x
    const deltaY = clientY - dragStartRef.current.y

    if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
      setHasDragged(true)
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      const newX = positionStartRef.current!.x + deltaX
      const newY = positionStartRef.current!.y + deltaY
      const clamped = clampPosition(newX, newY)
      setPosition(clamped)
    })
  }, [clampPosition])

  // 拖动结束
  const handleDragEnd = useCallback(() => {
    if (!hasDragged) {
      setIsDragging(false)
      onExpand()
      return
    }

    const corner = getNearestCorner(position.x, position.y)
    const snapPos = getSnapPosition(corner)
    setPosition(snapPos)
    setSnappedCorner(corner)
    setIsDragging(false)
    dragStartRef.current = null
    positionStartRef.current = null
  }, [hasDragged, position, getNearestCorner, getSnapPosition, onExpand])

  // 绑定全局事件
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
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 进度百分比（拖拽中用本地值，否则用外部传入的 currentTime）
  const progressPercent = seekingPercent ?? (duration > 0 ? (currentTime / duration) * 100 : 0)

  // 从鼠标位置计算百分比
  const calcPercent = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
  }, [])

  const handleTrackMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    // 立即更新视觉到点击位置
    setSeekingPercent(calcPercent(e.clientX))

    const handleMove = (ev: MouseEvent) => {
      ev.preventDefault()
      setSeekingPercent(calcPercent(ev.clientX))
    }

    const handleUp = (ev: MouseEvent) => {
      // 松手：用最终位置 seek 视频，清除拖拽状态
      const finalPct = calcPercent(ev.clientX)
      if (duration > 0) {
        onSeek((finalPct / 100) * duration)
      }
      setSeekingPercent(null)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [calcPercent, duration, onSeek])

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className={cn(
          'fixed z-[100] bg-black rounded-lg overflow-hidden',
          'border-[2px] border-black shadow-[3px_3px_0px_0px_#000]',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
          className
        )}
        style={{
          width: PIP_WIDTH,
          height: PIP_HEIGHT,
          left: position.x,
          top: position.y,
          touchAction: 'none',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        {/* 控制层 — PIP 小窗始终显示控制条 */}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent">
          {/* 进度条 — 拖拽 / 点击 seek */}
          <div
            ref={trackRef}
            className="relative h-1.5 bg-gray-600 cursor-pointer"
            onMouseDown={handleTrackMouseDown}
          >
            <div
              className="h-full bg-[#B4F416]"
              style={{ width: `${progressPercent}%` }}
            />
            {/* 扩大点击热区 */}
            <div className="absolute -top-1 -bottom-1 left-0 right-0" />
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onTogglePlay()
                }}
                className="p-1 text-white hover:text-[#B4F416] transition-colors"
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleMute()
                }}
                className="p-1 text-white hover:text-[#B4F416] transition-colors"
              >
                {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
              <span className="text-[10px] text-white font-mono">
                {formatTime(currentTime)}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onExpand()
              }}
              className="p-1 text-white hover:text-[#B4F416] transition-colors"
            >
              <Maximize className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 拖动指示器 */}
        {isDragging && (
          <div className="absolute inset-0 border-2 border-[#B4F416] rounded-lg pointer-events-none" />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default DraggablePIP
