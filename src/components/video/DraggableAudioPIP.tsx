'use client'

/**
 * 音频/视频 PIP（画中画）组件
 *
 * 双态切换：
 * - Expanded bar：封面 + 播放/暂停 + 进度条 + 时间 + 展开按钮
 * - Mini dot：3秒无操作自动收起 → 48×48 圆形，点击展开回 bar
 * - 支持拖拽、边缘吸附
 */

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Play, Pause, Maximize } from 'lucide-react'
import type { Video } from '@/types/video'

const PIP_WIDTH = 260
const PIP_HEIGHT = 64
const PIP_MARGIN = 12
const DRAG_THRESHOLD = 5
const MINI_DOT_SIZE = 48
const MINI_PEEK_OFFSET = MINI_DOT_SIZE / 2
const AUTO_COLLAPSE_DELAY = 3000
const SAFE_AREA_BOTTOM = 80

interface DraggableAudioPIPProps {
  video: Video
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

/** Mini dot 呼吸动画 variants（独立 transition 避免 exit 复用 animate 的 repeat 配置） */
const miniDotVariants = {
  initial: { scale: 0.5, opacity: 0 },
  animate: {
    scale: [1, 1.05, 1],
    opacity: 1,
    transition: {
      scale: { repeat: Infinity, duration: 2, ease: 'easeInOut' as const, repeatType: 'loop' as const },
      opacity: { duration: 0.2 },
    },
  },
  exit: {
    scale: 0.5,
    opacity: 0,
    transition: { duration: 0.15 },
  },
}

function getPipSize(miniMode: boolean): { width: number; height: number } {
  if (miniMode) return { width: MINI_DOT_SIZE, height: MINI_DOT_SIZE }
  return {
    width: Math.min(PIP_WIDTH, window.innerWidth - PIP_MARGIN * 2),
    height: PIP_HEIGHT,
  }
}

function detectCorner(x: number, y: number, miniMode: boolean): Corner {
  if (typeof window === 'undefined') return 'bottom-right'
  const size = getPipSize(miniMode)
  const centerX = x + size.width / 2
  const centerY = y + size.height / 2
  const windowCenterX = window.innerWidth / 2
  const windowCenterY = window.innerHeight / 2

  if (centerX < windowCenterX && centerY < windowCenterY) return 'top-left'
  if (centerX >= windowCenterX && centerY < windowCenterY) return 'top-right'
  if (centerX < windowCenterX && centerY >= windowCenterY) return 'bottom-left'
  return 'bottom-right'
}

function snapToCorner(corner: Corner, miniMode: boolean): Position {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  const size = getPipSize(miniMode)

  switch (corner) {
    case 'top-left':
      return { x: PIP_MARGIN, y: PIP_MARGIN }
    case 'top-right':
      return { x: window.innerWidth - size.width - PIP_MARGIN, y: PIP_MARGIN }
    case 'bottom-left':
      return { x: PIP_MARGIN, y: window.innerHeight - size.height - PIP_MARGIN - SAFE_AREA_BOTTOM }
    case 'bottom-right':
    default:
      return { x: window.innerWidth - size.width - PIP_MARGIN, y: window.innerHeight - size.height - PIP_MARGIN - SAFE_AREA_BOTTOM }
  }
}

function clampToScreen(x: number, y: number, miniMode: boolean): Position {
  if (typeof window === 'undefined') return { x, y }
  const size = getPipSize(miniMode)
  if (miniMode) {
    // Mini 模式允许水平方向半隐藏（贴边），垂直方向正常 clamp
    return {
      x: Math.max(-MINI_PEEK_OFFSET, Math.min(x, window.innerWidth - MINI_PEEK_OFFSET)),
      y: Math.max(0, Math.min(y, window.innerHeight - size.height - SAFE_AREA_BOTTOM)),
    }
  }
  return {
    x: Math.max(0, Math.min(x, window.innerWidth - size.width)),
    y: Math.max(0, Math.min(y, window.innerHeight - size.height - SAFE_AREA_BOTTOM)),
  }
}

/** Mini dot 吸附到最近的左/右屏幕边缘，半个藏在屏幕外 */
function snapMiniToEdge(x: number, y: number): Position {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  const isRightEdge = x + MINI_DOT_SIZE / 2 >= window.innerWidth / 2
  const snapX = isRightEdge
    ? window.innerWidth - MINI_PEEK_OFFSET
    : -MINI_PEEK_OFFSET
  const clampY = Math.max(PIP_MARGIN, Math.min(
    y,
    window.innerHeight - MINI_DOT_SIZE - PIP_MARGIN - SAFE_AREA_BOTTOM,
  ))
  return { x: snapX, y: clampY }
}

export function DraggableAudioPIP({
  video,
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
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  // positionRef 保持与 position 同步，供 isMiniMode 切换 effect 读取最新值
  const positionRef = useRef<Position>({ x: 0, y: 0 })
  positionRef.current = position

  const [isDragging, setIsDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const dragStartRef = useRef<Position | null>(null)
  const positionStartRef = useRef<Position | null>(null)
  const rafRef = useRef<number | null>(null)
  const [snappedCorner, setSnappedCorner] = useState<Corner>('bottom-right')
  const trackRef = useRef<HTMLDivElement>(null)
  const [seekingPercent, setSeekingPercent] = useState<number | null>(null)

  // Mini dot 状态
  const [isMiniMode, setIsMiniMode] = useState(false)
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 自动收起定时器 ──
  // bar 模式下启动 3s 倒计时；seek / 拖拽 / 播放暂停时通过 dep 变化自动重置
  useEffect(() => {
    if (isMiniMode || seekingPercent !== null || isDragging) {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
        collapseTimerRef.current = null
      }
      return
    }

    collapseTimerRef.current = setTimeout(() => {
      setIsMiniMode(true)
    }, AUTO_COLLAPSE_DELAY)

    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
      }
    }
  }, [isMiniMode, seekingPercent, isDragging, isPlaying])

  // ── 初始化位置（底部偏右） ──
  useEffect(() => {
    if (typeof window === 'undefined') return

    const initPosition = () => {
      const size = getPipSize(false)
      setPosition({
        x: window.innerWidth - size.width - PIP_MARGIN,
        y: window.innerHeight - size.height - PIP_MARGIN - SAFE_AREA_BOTTOM,
      })
    }
    initPosition()
    window.addEventListener('resize', initPosition)
    return () => window.removeEventListener('resize', initPosition)
  }, [])

  // ── isMiniMode 切换时重算位置 ──
  useEffect(() => {
    if (typeof window === 'undefined') return

    const pos = positionRef.current
    if (isMiniMode) {
      // Bar → Mini：贴边吸附，半个藏在屏幕外
      setPosition(snapMiniToEdge(pos.x, pos.y))
    } else {
      // Mini → Bar：固定右下角
      setSnappedCorner('bottom-right')
      setPosition(snapToCorner('bottom-right', false))
    }
    // 仅在 isMiniMode 变化时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMiniMode])

  // ── 拖拽 ──

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
      setPosition(clampToScreen(newX, newY, isMiniMode))
    })
  }, [isMiniMode])

  const handleDragEnd = useCallback(() => {
    if (!hasDragged) {
      setIsDragging(false)
      if (isMiniMode) {
        // Mini dot 点击 → 展开回 PIP bar
        setIsMiniMode(false)
      } else {
        // Bar 点击 → 回到全屏播放页
        onExpand()
      }
      return
    }
    if (isMiniMode) {
      setPosition(snapMiniToEdge(position.x, position.y))
    } else {
      const corner = detectCorner(position.x, position.y, false)
      setPosition(snapToCorner(corner, false))
      setSnappedCorner(corner)
    }
    setIsDragging(false)
    dragStartRef.current = null
    positionStartRef.current = null
  }, [hasDragged, position, isMiniMode, onExpand])

  // useLayoutEffect 保证 listener 在 paint 前同步注册，避免快速点击时 mouseup 先于 listener 触发
  useLayoutEffect(() => {
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

  // ── 进度条 seek ──

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

  // ── 渲染 ──

  const coverUrl = video.cover_url || video.thumbnail_url || fallbackImageUrl
  const barWidth = typeof window !== 'undefined'
    ? Math.min(PIP_WIDTH, window.innerWidth - PIP_MARGIN * 2)
    : PIP_WIDTH

  return (
    <AnimatePresence mode="wait">
      {isMiniMode ? (
        /* ── Mini dot ── */
        <motion.div
          key="mini"
          ref={containerRef}
          className={cn(
            'fixed z-[100] rounded-lg overflow-hidden',
            isDragging ? 'cursor-grabbing' : 'cursor-pointer',
            className
          )}
          style={{
            width: MINI_DOT_SIZE,
            height: MINI_DOT_SIZE,
            left: position.x,
            top: position.y,
            touchAction: 'none',
            backgroundColor: '#111',
          }}
          variants={miniDotVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          {/* 封面背景 */}
          {coverUrl ? (
            <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[#333]" />
          )}

          {/* 半透明遮罩 */}
          <div className="absolute inset-0 bg-black/30" />

          {/* 右下角播放/暂停状态指示（纯展示，不可点击） */}
          <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center pointer-events-none">
            {isPlaying ? (
              <Pause className="w-2 h-2 text-white" />
            ) : (
              <Play className="w-2 h-2 text-white ml-[1px]" />
            )}
          </div>

          {/* 拖动指示器 */}
          {isDragging && (
            <div className="absolute inset-0 border-2 border-[#B4F416] rounded-lg pointer-events-none" />
          )}
        </motion.div>
      ) : (
        /* ── Expanded bar ── */
        <motion.div
          key="bar"
          ref={containerRef}
          className={cn(
            'fixed z-[100] rounded-xl overflow-hidden',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
            className
          )}
          style={{
            height: PIP_HEIGHT,
            width: barWidth,
            left: position.x,
            top: position.y,
            touchAction: 'none',
            backgroundColor: '#111',
          }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
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
      )}
    </AnimatePresence>
  )
}
