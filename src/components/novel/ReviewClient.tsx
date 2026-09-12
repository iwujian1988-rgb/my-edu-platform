'use client'

/**
 * 小说词卡复习（《落地》/read/[bookId]/review）
 *
 * 翻面卡 + 三键评分（不认识/模糊/认识 → SM-2 quality 1/2/3）
 * 交互逻辑改造自 video-flashcards：移动端滑动手势 + 键盘快捷键 + 乐观更新。
 * 范围：本章新词 / 生词本 / ★核心词 / 全书；断点续刷 localStorage。
 * 数据与复习进度全部走 novel_* 表（与词书学习系统物理隔离）。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  RotateCcw,
  Check,
  Volume2,
  Star,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  BookOpen,
} from 'lucide-react'
import { useFrenchTTS } from '@/hooks/useFrenchTTS'
import type { NovelWord } from './NewWordsPanel'

export type ReviewRange = 'chapter' | 'notebook' | 'star' | 'all'

interface ReviewClientProps {
  bookId: string
  bookTitle: string
  range: ReviewRange
  chapter?: number
  /** 用于"本章"范围兜底：当前阅读进度章 */
  progressChapter?: number
}

const REVIEW_OPTIONS = [
  {
    quality: 1 as const,
    label: '不认识',
    subLabel: '1 天后再见',
    color: 'border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400',
    swipe: 'left' as const,
  },
  {
    quality: 2 as const,
    label: '模糊',
    subLabel: '几天后再见',
    color: 'border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400',
    swipe: 'down' as const,
  },
  {
    quality: 3 as const,
    label: '认识',
    subLabel: '越隔越久',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400',
    swipe: 'right' as const,
  },
]

const SWIPE_THRESHOLD = 80
const SWIPE_VELOCITY_THRESHOLD = 0.3

export function ReviewClient({ bookId, bookTitle, range: initialRange, chapter: initialChapter, progressChapter }: ReviewClientProps) {
  const { speak } = useFrenchTTS()

  const [range, setRange] = useState<ReviewRange>(initialRange)
  const [chapter, setChapter] = useState<number>(initialChapter || progressChapter || 1)

  const [words, setWords] = useState<NovelWord[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [resumedAt, setResumedAt] = useState<number | null>(null)
  const [swipeHint, setSwipeHint] = useState<'left' | 'right' | 'up' | 'down' | null>(null)

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const swipeOffsetRef = useRef({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  const rangeKey = range === 'chapter' ? `chapter-${chapter}` : range
  const storageKey = `novel-review-pos-${bookId}-${rangeKey}`

  // 拉词
  useEffect(() => {
    let url = `/api/novel/${bookId}/words`
    if (range === 'chapter') url += `?chapter=${chapter}`
    else if (range === 'notebook') url += '?notebook=true'
    else if (range === 'star') url += '?star=true'

    setWords(null)
    setLoadError(false)
    setCurrentIndex(0)
    setIsFlipped(false)
    setReviewedCount(0)
    setCorrectCount(0)
    setResumedAt(null)

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json()
      })
      .then((json) => {
        const list: NovelWord[] = json.data?.words || []
        setWords(list)
        // 断点续刷：本轮没刷完的从上次位置继续
        const saved = parseInt(localStorage.getItem(storageKey) || '', 10)
        if (Number.isInteger(saved) && saved > 0 && saved < list.length) {
          setCurrentIndex(saved)
          setResumedAt(saved)
        }
      })
      .catch(() => setLoadError(true))
  }, [bookId, range, chapter, storageKey])

  const total = words?.length || 0
  const currentWord = words?.[currentIndex]
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0

  const updateCardTransform = useCallback((x: number, y: number, immediate = false) => {
    if (!cardRef.current) return
    const rotation = x * 0.05
    const scale = isDraggingRef.current ? 0.98 : 1
    cardRef.current.style.transform = `translateX(${x}px) translateY(${y}px) rotate(${rotation}deg) scale(${scale})`
    cardRef.current.style.transition = immediate ? 'none' : 'transform 0.3s ease-out'
  }, [])

  const persistIndex = useCallback(
    (i: number) => {
      if (i >= total) localStorage.removeItem(storageKey)
      else localStorage.setItem(storageKey, String(i))
    },
    [storageKey, total]
  )

  // 提交评分（乐观更新）
  const handleReview = useCallback(
    (quality: 1 | 2 | 3) => {
      if (!currentWord) return

      setReviewedCount((c) => c + 1)
      if (quality >= 3) setCorrectCount((c) => c + 1)

      swipeOffsetRef.current = { x: 0, y: 0 }
      isDraggingRef.current = false
      setSwipeHint(null)
      updateCardTransform(0, 0, false)

      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setIsFlipped(false)
      persistIndex(nextIndex)

      fetch(`/api/novel/${bookId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', lemma: currentWord.word, quality }),
      })
        .then((r) => {
          if (!r.ok) toast.error('复习记录同步失败')
        })
        .catch(() => toast.error('网络错误，复习记录未同步'))
    },
    [currentWord, currentIndex, bookId, updateCardTransform, persistIndex]
  )

  // 触摸滑动（照 video-flashcards 手势）
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    isDraggingRef.current = true
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || !isDraggingRef.current) return
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        if (!touchStartRef.current) return
        const touch = e.touches[0]
        const deltaX = touch.clientX - touchStartRef.current.x
        const deltaY = touch.clientY - touchStartRef.current.y
        swipeOffsetRef.current = { x: deltaX, y: deltaY }
        updateCardTransform(deltaX, deltaY, true)

        const absX = Math.abs(deltaX)
        const absY = Math.abs(deltaY)
        const threshold = SWIPE_THRESHOLD * 0.5
        if (absX > threshold || absY > threshold) {
          const newHint = absX > absY ? (deltaX > 0 ? 'right' : 'left') : deltaY > 0 ? 'down' : 'up'
          setSwipeHint((prev) => (prev !== newHint ? newHint : prev))
        } else {
          setSwipeHint((prev) => (prev !== null ? null : prev))
        }
      })
    },
    [updateCardTransform]
  )

  const handleTouchEnd = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (!touchStartRef.current) return

    const { x: deltaX, y: deltaY } = swipeOffsetRef.current
    const deltaTime = Date.now() - touchStartRef.current.time
    const velocityX = Math.abs(deltaX) / deltaTime
    const velocityY = Math.abs(deltaY) / deltaTime
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    const isHorizontal = absX > SWIPE_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD
    const isVertical = absY > SWIPE_THRESHOLD || velocityY > SWIPE_VELOCITY_THRESHOLD

    if (isHorizontal && absX > absY) {
      handleReview(deltaX > 0 ? 3 : 1)
      return
    }
    if (isVertical && absY > absX) {
      if (deltaY > 0) {
        handleReview(2)
      } else if (!isFlipped) {
        setIsFlipped(true)
        swipeOffsetRef.current = { x: 0, y: 0 }
        isDraggingRef.current = false
        updateCardTransform(0, 0, false)
        setSwipeHint(null)
        touchStartRef.current = null
      }
      return
    }

    swipeOffsetRef.current = { x: 0, y: 0 }
    isDraggingRef.current = false
    updateCardTransform(0, 0, false)
    setSwipeHint(null)
    touchStartRef.current = null
  }, [isFlipped, handleReview, updateCardTransform])

  // 键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!currentWord) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setIsFlipped((v) => !v)
        return
      }
      if (e.key === '1' || e.key === 'ArrowLeft') handleReview(1)
      else if (e.key === '2' || e.key === 'ArrowDown') handleReview(2)
      else if (e.key === '3' || e.key === 'ArrowRight') handleReview(3)
      else if (e.key === 'ArrowUp' && !isFlipped) setIsFlipped(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentWord, isFlipped, handleReview])

  const restart = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setReviewedCount(0)
    setCorrectCount(0)
    setResumedAt(null)
    persistIndex(0)
  }

  const switchRange = (r: ReviewRange) => {
    if (r === range) return
    setRange(r)
  }

  const rangeLabel = useMemo(() => {
    if (range === 'chapter') return `第 ${chapter} 章新词`
    if (range === 'notebook') return '生词本'
    if (range === 'star') return '★核心词'
    return '全书'
  }, [range, chapter])

  const emptyHint = useMemo(() => {
    if (range === 'notebook') return '生词本还是空的——读正文时点蓝色词，加进来这里复习。'
    if (range === 'star') return '本书暂无核心词标记。'
    return '这里还没有词。'
  }, [range])

  // 加载中
  if (words === null && !loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fbfcff] to-[#f7f9fd] dark:from-[#101626] dark:to-[#0c1120]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-[#6550ff] border-t-transparent" />
          <p className="text-sm font-semibold text-[#68718a] dark:text-[#a7b0c8]">加载词卡中…</p>
        </div>
      </div>
    )
  }

  // 加载失败
  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fbfcff] to-[#f7f9fd] dark:from-[#101626] dark:to-[#0c1120]">
        <div className="p-8 text-center">
          <p className="mb-4 font-semibold text-[#121729] dark:text-[#edf1ff]">词卡暂时没加载出来，请稍后再试。</p>
          <button
            onClick={() => switchRange(range === 'chapter' ? 'all' : 'chapter')}
            className="cursor-pointer rounded-lg bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  // 空状态
  if (total === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#fbfcff] to-[#f7f9fd] px-4 dark:from-[#101626] dark:to-[#0c1120]">
        <div className="max-w-md rounded-[12px] border border-[#e7eaf2] bg-white p-8 text-center shadow-[0_9px_24px_rgba(31,42,104,0.06)] dark:border-[#273149] dark:bg-[#141b2d]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#2633a8]/10 to-[#6550ff]/10">
            <BookOpen className="h-6 w-6 text-[#6550ff]" />
          </div>
          <h3 className="mb-2 text-lg font-extrabold text-[#121729] dark:text-[#edf1ff]">{rangeLabel} · 暂无内容</h3>
          <p className="mb-6 text-sm text-[#68718a] dark:text-[#a7b0c8]">{emptyHint}</p>
          <Link
            href={`/read/${bookId}`}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            回目录
          </Link>
        </div>
      </div>
    )
  }

  // 完成状态
  if (currentIndex >= total) {
    const accuracy = reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#fbfcff] to-[#f7f9fd] px-4 dark:from-[#101626] dark:to-[#0c1120]">
        <div className="w-full max-w-md rounded-[12px] border border-[#e7eaf2] bg-white p-8 text-center shadow-[0_9px_24px_rgba(31,42,104,0.06)] dark:border-[#273149] dark:bg-[#141b2d]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#2633a8] to-[#6550ff]">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h3 className="mb-1 text-xl font-extrabold text-[#121729] dark:text-[#edf1ff]">本轮复习完成</h3>
          <p className="mb-6 text-sm text-[#68718a] dark:text-[#a7b0c8]">{rangeLabel} · {bookTitle}</p>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[#f8faff] p-4 dark:bg-[#192238]">
              <div className="text-2xl font-extrabold text-[#121729] dark:text-[#edf1ff]">{reviewedCount}</div>
              <div className="text-xs text-[#68718a] dark:text-[#a7b0c8]">已复习</div>
            </div>
            <div className="rounded-lg bg-[#f8faff] p-4 dark:bg-[#192238]">
              <div className="text-2xl font-extrabold text-[#2d39bb] dark:text-[#bcc5ff]">{accuracy}%</div>
              <div className="text-xs text-[#68718a] dark:text-[#a7b0c8]">认识率</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={restart}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <RotateCcw className="h-4 w-4" />
              再来一轮
            </button>
            <Link
              href={`/read/${bookId}`}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#e7eaf2] px-5 py-2.5 text-sm font-semibold text-[#121729] transition-colors hover:bg-[#f8faff] dark:border-[#273149] dark:text-[#edf1ff] dark:hover:bg-[#192238]"
            >
              回目录
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const swipeHintColor =
    swipeHint === 'left'
      ? 'bg-rose-500/10 border-rose-400 text-rose-500'
      : swipeHint === 'right'
        ? 'bg-emerald-500/10 border-emerald-400 text-emerald-600'
        : swipeHint === 'down'
          ? 'bg-amber-500/10 border-amber-400 text-amber-600'
          : 'bg-[#6550ff]/10 border-[#6550ff] text-[#6550ff]'

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#fbfcff] to-[#f7f9fd] text-[#121729] dark:from-[#101626] dark:to-[#0c1120] dark:text-[#edf1ff]">
      {/* 顶栏 */}
      <header className="shrink-0 border-b border-[#e7eaf2] bg-white/95 backdrop-blur dark:border-[#273149] dark:bg-[#141b2d]/95">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-4">
          <Link
            href={`/read/${bookId}`}
            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#68718a] transition-colors hover:bg-[#f3f5fb] hover:text-[#121729] dark:text-[#a7b0c8] dark:hover:bg-[#192238] dark:hover:text-[#edf1ff]"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">目录</span>
          </Link>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-bold">词卡复习 · {rangeLabel}</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#68718a] dark:text-[#a7b0c8]">
            {reviewedCount > 0 && (
              <span className="rounded bg-[#f3f5fb] px-1.5 py-0.5 dark:bg-[#192238]">
                {reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0}%
              </span>
            )}
          </div>
        </div>

        {/* 范围切换 */}
        <div className="mx-auto flex max-w-4xl gap-1.5 overflow-x-auto px-4 pb-2.5">
          {([
            { r: 'chapter' as ReviewRange, label: `本章·${chapter}` },
            { r: 'notebook' as ReviewRange, label: '生词本' },
            { r: 'star' as ReviewRange, label: '★核心词' },
            { r: 'all' as ReviewRange, label: '全书' },
          ]).map(({ r, label }) => (
            <button
              key={r}
              onClick={() => switchRange(r)}
              className={cn(
                'shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200',
                range === r
                  ? 'bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] text-white'
                  : 'bg-[#f3f5fb] text-[#68718a] hover:text-[#121729] dark:bg-[#192238] dark:text-[#a7b0c8] dark:hover:text-[#edf1ff]'
              )}
            >
              {label}
            </button>
          ))}
          {resumedAt !== null && (
            <span className="shrink-0 self-center text-[10px] text-[#68718a] dark:text-[#a7b0c8]">
              已从第 {resumedAt + 1} 张续刷
            </span>
          )}
        </div>
      </header>

      {/* 主区 */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-3 overflow-hidden px-4 py-4">
        {/* 进度条 */}
        <div className="shrink-0">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#68718a] dark:text-[#a7b0c8]">
            <span>
              {currentIndex + 1} / {total}
            </span>
            <span>
              已复习 {reviewedCount}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#e7eaf2] dark:bg-[#273149]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2633a8] to-[#6550ff] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 滑动提示（移动端） */}
        <div className="flex shrink-0 justify-center gap-4 py-0.5 text-[11px] text-[#68718a] dark:text-[#a7b0c8] md:hidden">
          {!isFlipped && (
            <span className="flex items-center gap-0.5">
              <ArrowUp className="h-3 w-3" /> 翻转
            </span>
          )}
          <span className="flex items-center gap-0.5 text-rose-500">
            <ArrowLeft className="h-3 w-3" /> 不认识
          </span>
          <span className="flex items-center gap-0.5 text-amber-500">
            <ArrowDown className="h-3 w-3" /> 模糊
          </span>
          <span className="flex items-center gap-0.5 text-emerald-500">
            <ArrowRight className="h-3 w-3" /> 认识
          </span>
        </div>

        {/* 卡片区 */}
        <div className="relative min-h-0 flex-1" style={{ perspective: '1000px' }}>
          {swipeHint && (
            <div
              className={cn(
                'pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[12px] border-2 transition-all duration-150',
                swipeHintColor
              )}
            >
              <span className="text-2xl font-extrabold">
                {swipeHint === 'left' && '不认识'}
                {swipeHint === 'right' && '认识'}
                {swipeHint === 'down' && '模糊'}
                {swipeHint === 'up' && '翻转'}
              </span>
            </div>
          )}

          <div
            ref={cardRef}
            className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => setIsFlipped((v) => !v)}
          >
            {/* 正面：法语词 */}
            <div
              className={cn(
                'absolute inset-0 flex flex-col rounded-[12px] border border-[#e7eaf2] bg-white p-6 shadow-[0_12px_34px_rgba(31,42,104,0.08)] transition-all duration-300 dark:border-[#273149] dark:bg-[#141b2d]',
                isFlipped ? 'pointer-events-none opacity-0' : 'opacity-100'
              )}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="mb-3 flex items-center gap-1.5">
                  {currentWord?.star && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                  {currentWord?.cefr && (
                    <span className="rounded bg-[#f3f5fb] px-1.5 py-0.5 text-[10px] font-bold text-[#68718a] dark:bg-[#192238] dark:text-[#a7b0c8]">
                      {currentWord.cefr}
                    </span>
                  )}
                </div>
                <p className="mb-3 text-3xl font-extrabold tracking-[-0.01em] md:text-4xl">
                  {currentWord?.word}
                </p>
                <div className="flex items-center gap-2 text-sm text-[#68718a] dark:text-[#a7b0c8]">
                  {currentWord?.gender && (
                    <span>{currentWord.gender === 'f' ? 'n.f.' : 'n.m.'}</span>
                  )}
                  {currentWord?.phonetic && <span className="font-mono">[{currentWord.phonetic}]</span>}
                </div>
              </div>

              <div className="mb-3 flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (currentWord?.word) speak(currentWord.word)
                  }}
                  aria-label="发音"
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#e7eaf2] px-4 py-2 text-xs font-semibold text-[#2d39bb] transition-all duration-200 hover:border-[#6550ff]/40 hover:bg-[#f8faff] dark:border-[#273149] dark:text-[#bcc5ff] dark:hover:bg-[#192238]"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  发音
                </button>
              </div>

              <p className="text-center text-xs text-[#68718a] dark:text-[#a7b0c8]">
                <span className="hidden md:inline">点击或按空格翻面 · 键盘 1/2/3 评分</span>
                <span className="md:hidden">点卡片翻面</span>
              </p>
            </div>

            {/* 背面：释义 */}
            <div
              className={cn(
                'absolute inset-0 flex flex-col rounded-[12px] border border-[#e7eaf2] bg-white p-4 shadow-[0_12px_34px_rgba(31,42,104,0.08)] transition-all duration-300 md:p-6 dark:border-[#273149] dark:bg-[#141b2d]',
                isFlipped ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex-1 space-y-3 overflow-y-auto">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-extrabold">{currentWord?.word}</p>
                  {currentWord?.theme && (
                    <span className="max-w-[180px] truncate rounded bg-[#f3f5fb] px-1.5 py-0.5 text-[10px] text-[#68718a] dark:bg-[#192238] dark:text-[#a7b0c8]">
                      {currentWord.theme}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#68718a] dark:text-[#a7b0c8]">
                  {currentWord?.part_of_speech && <span>{currentWord.part_of_speech}</span>}
                  {currentWord?.gender && (
                    <span>{currentWord.gender === 'f' ? 'n.f.' : 'n.m.'}</span>
                  )}
                  {currentWord?.phonetic && <span className="font-mono">[{currentWord.phonetic}]</span>}
                </div>

                <p className="text-base font-semibold leading-relaxed">{currentWord?.definition}</p>

                {currentWord?.example_sentence && (
                  <div className="rounded-lg bg-[#f8faff] p-3 text-sm leading-relaxed text-[#3c4459] dark:bg-[#192238] dark:text-[#c5cce0]">
                    {currentWord.example_sentence}
                  </div>
                )}
              </div>

              {/* 评分按钮 */}
              <div className="border-t border-[#e7eaf2] pt-3 dark:border-[#273149]">
                <p className="mb-2 text-center text-xs font-semibold text-[#68718a] dark:text-[#a7b0c8]">
                  {isFlipped ? '还记得吗？' : ''}
                </p>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {REVIEW_OPTIONS.map((option) => (
                    <button
                      key={option.quality}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReview(option.quality)
                      }}
                      className={cn(
                        'flex cursor-pointer flex-col items-center rounded-lg border py-2.5 transition-all duration-200 hover:-translate-y-0.5 md:py-3',
                        option.color
                      )}
                    >
                      <span className="text-xs font-bold md:text-sm">{option.label}</span>
                      <span className="mt-0.5 hidden text-[10px] opacity-70 md:inline">{option.subLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 键盘提示（PC） */}
        <div className="hidden shrink-0 py-1 text-center text-xs text-[#68718a] dark:text-[#a7b0c8] md:block">
          ↑/空格 翻面 · ← 1 不认识 · ↓ 2 模糊 · → 3 认识
        </div>
      </div>
    </div>
  )
}
