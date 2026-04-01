'use client'

/**
 * 可拖动画中画 (PIP) 组件
 *
 * 核心优化：不再创建独立的 <video> 元素，而是复用主视频元素。
 * 通过 appendChild 将主视频 DOM 节点移入 PIP 容器，零缓冲延迟。
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

const PIP_WIDTH = 160
const PIP_HEIGHT = 90
const PIP_MARGIN = 16
const SNAP_THRESHOLD = 50
const DRAG_THRESHOLD = 5

// ============================================
// 类型定义
// ============================================

interface DraggablePIPProps {
  video: Video
  /** 外部传入的主视频 DOM 元素，直接移入 PIP 容器（零缓冲） */
  videoElement: HTMLVideoElement | null
  isPlaying: boolean
  currentTime: number
  duration: number
  isMuted: boolean
  onTogglePlay: () => void
  onToggleMute: () => void
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
  onExpand,
  onTimeUpdate,
  className,
}: DraggablePIPProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoSlotRef = useRef<HTMLDivElement>(null)
  const originalParentRef = useRef<HTMLElement | null>(null)
  const originalNextSiblingRef = useRef<Node | null>(null)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const dragStartRef = useRef<Position | null>(null)
  const positionStartRef = useRef<Position | null>(null)
  const rafRef = useRef<number | null>(null)
  const [snappedCorner, setSnappedCorner] = useState<Corner>('bottom-right')

  // 将外部视频元素移入 PIP 容器（挂载时），卸载时还原
  useEffect(() => {
    if (!videoElement || !videoSlotRef.current) return

    // 记录原始位置，以便还原
    originalParentRef.current = videoElement.parentElement
    originalNextSiblingRef.current = videoElement.nextSibling

    // 调整样式适配 PIP 尺寸
    videoElement.style.width = '100%'
    videoElement.style.height = '100%'
    videoElement.style.objectFit = 'contain'
    videoElement.style.aspectRatio = ''

    // 移入 PIP 容器
    videoSlotRef.current.appendChild(videoElement)

    return () => {
      // 还原到原始父容器
      const parent = originalParentRef.current
      if (parent && videoElement.parentElement === videoSlotRef.current) {
        if (originalNextSiblingRef.current) {
          parent.insertBefore(videoElement, originalNextSiblingRef.current)
        } else {
          parent.appendChild(videoElement)
        }
      }
      // 清除 PIP 样式
      videoElement.style.width = ''
      videoElement.style.height = ''
      videoElement.style.objectFit = ''
    }
  }, [videoElement])

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

  // 进度百分比
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

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
        {/* 视频插槽 - 外部 video 元素将移入此处 */}
        <div ref={videoSlotRef} className="w-full h-full" />

        {/* 控制层 */}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent opacity-0 hover:opacity-100 transition-opacity">
          {/* 进度条 */}
          <div className="h-1 bg-gray-600">
            <div
              className="h-full bg-[#B4F416]"
              style={{ width: `${progressPercent}%` }}
            />
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
