'use client'

/**
 * 视频卡片复习页 - 客户端组件
 *
 * 基于 SM-2 算法的间隔重复复习
 * 支持多种卡片类型（词汇、短语、惯用语）
 * 移动端滑动手势支持
 *
 * 设计风格：Neo-brutalism，与全站统一
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  RotateCcw,
  Check,
  Volume2,
  BookOpen,
  MessageSquare,
  Sparkles,
  Flame,
  ChevronLeft,
  Video,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import Link from 'next/link'
import type {
  CardType,
  FlashcardReviewResponse,
} from '@/types/video'

// 卡片类型配置（用于显示类型标签）
const CARD_TYPE_LABELS: Record<CardType, { label: string; icon: React.ElementType; color: string }> = {
  word: { label: '词汇', icon: BookOpen, color: 'bg-blue-100' },
  phrase: { label: '短语', icon: MessageSquare, color: 'bg-purple-100' },
  expression: { label: '惯用语', icon: Sparkles, color: 'bg-orange-100' },
}

// 评分配置
const REVIEW_OPTIONS = [
  {
    quality: 1,
    label: '忘记',
    subLabel: '1天后再见',
    color: 'bg-red-100 hover:bg-red-200 border-red-400',
    textColor: 'text-red-600',
    swipe: 'left' as const,
  },
  {
    quality: 2,
    label: '一般',
    subLabel: '3天后',
    color: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-400',
    textColor: 'text-yellow-600',
    swipe: 'down' as const,
  },
  {
    quality: 3,
    label: '简单',
    subLabel: '7天后',
    color: 'bg-green-100 hover:bg-green-200 border-green-400',
    textColor: 'text-green-600',
    swipe: 'right' as const,
  },
]

// SWR fetcher
const fetcher = async (url: string): Promise<FlashcardReviewResponse> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  const json = await res.json()
  return json.data
}

// 滑动手势阈值
const SWIPE_THRESHOLD = 80
const SWIPE_VELOCITY_THRESHOLD = 0.3

export function VideoFlashcardsClient() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [swipeHint, setSwipeHint] = useState<'left' | 'right' | 'up' | 'down' | null>(null)
  const [isAudioLoading, setIsAudioLoading] = useState(false)

  // 使用 refs 存储滑动状态，避免频繁 setState 导致重渲染
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const swipeOffsetRef = useRef({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  // 音频缓存（全局，避免重复请求）
  const audioCacheRef = useRef<Map<string, string>>(new Map())
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  // 查询参数
  const queryParams = 'limit=50'

  // 获取待复习卡片
  const { data, error, isLoading, mutate } = useSWR<FlashcardReviewResponse>(
    `/api/user/video-cards/review?${queryParams}`,
    fetcher
  )

  const currentCard = data?.items[currentIndex]
  const totalCards = data?.items.length || 0
  const progress = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0

  // 预加载当前卡片音频
  useEffect(() => {
    if (!currentCard?.card.text) return

    const text = currentCard.card.text
    const cacheKey = text.toLowerCase()

    // 已缓存则跳过
    if (audioCacheRef.current.has(cacheKey)) return

    // 优先使用卡片关联的视频语言，否则回退到字符检测
    const videoLanguage = currentCard.card.video_language
    const language = videoLanguage || (/[àâäéèêëîïôöùûüçœæ]/i.test(text) ? 'fr' : 'en')

    // 后台预加载音频
    const preloadAudio = async () => {
      try {
        const response = await fetch(`/api/tts?text=${encodeURIComponent(text)}&type=2&language=${language}`)
        if (response.ok) {
          const blob = await response.blob()
          const audioUrl = URL.createObjectURL(blob)
          audioCacheRef.current.set(cacheKey, audioUrl)
        }
      } catch {
        // 预加载失败不影响用户体验
      }
    }

    // 延迟预加载，避免与页面渲染竞争
    const timer = setTimeout(preloadAudio, 500)
    return () => clearTimeout(timer)
  }, [currentCard])

  // 播放音频
  const playAudio = useCallback(async (text: string, preferredLanguage?: string) => {
    if (!text) return

    // 停止当前播放
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }

    const cacheKey = text.toLowerCase()
    // 优先使用视频语言，否则回退到字符检测
    const hasFrenchChars = /[àâäéèêëîïôöùûüçœæ]/i.test(text)
    const language = preferredLanguage || (hasFrenchChars ? 'fr' : 'en')

    setIsAudioLoading(true)

    try {
      let audioUrl = audioCacheRef.current.get(cacheKey)

      // 未缓存，请求 API
      if (!audioUrl) {
        const response = await fetch(`/api/tts?text=${encodeURIComponent(text)}&type=2&language=${language}`)

        if (!response.ok) {
          // API 失败，回退到浏览器 TTS
          if ('speechSynthesis' in window) {
            speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = language === 'fr' ? 'fr-FR' : 'en-US'
            utterance.rate = 0.8
            speechSynthesis.speak(utterance)
          }
          setIsAudioLoading(false)
          return
        }

        const blob = await response.blob()
        audioUrl = URL.createObjectURL(blob)
        audioCacheRef.current.set(cacheKey, audioUrl)
      }

      // 播放
      const audio = new Audio(audioUrl)
      currentAudioRef.current = audio

      audio.onended = () => {
        currentAudioRef.current = null
        setIsAudioLoading(false)
      }

      audio.onerror = () => {
        currentAudioRef.current = null
        setIsAudioLoading(false)
      }

      await audio.play()
    } catch (error) {
      console.warn('[Flashcard TTS] 播放失败:', error)
      setIsAudioLoading(false)
    }
  }, [])

  // 直接更新卡片 DOM 的 transform（不触发 React 重渲染）
  const updateCardTransform = useCallback((x: number, y: number, immediate: boolean = false) => {
    if (!cardRef.current) return
    const rotation = x * 0.05
    const scale = isDraggingRef.current ? 0.98 : 1
    cardRef.current.style.transform = `translateX(${x}px) translateY(${y}px) rotate(${rotation}deg) scale(${scale})`
    cardRef.current.style.transition = immediate ? 'none' : 'transform 0.3s ease-out'
  }, [])

  // 提交复习结果（乐观更新）
  const handleReview = useCallback(
    (quality: 1 | 2 | 3) => {
      if (!currentCard) return

      // 🚀 乐观更新：立即更新 UI
      setReviewedCount((c) => c + 1)
      if (quality >= 2) {
        setCorrectCount((c) => c + 1)
      }

      // 重置滑动状态
      swipeOffsetRef.current = { x: 0, y: 0 }
      isDraggingRef.current = false
      setSwipeHint(null)
      updateCardTransform(0, 0, false)

      // 下一张
      if (currentIndex < totalCards - 1) {
        setCurrentIndex((i) => i + 1)
        setIsFlipped(false)
      }

      // 后台发送 API 请求（不阻塞 UI）
      fetch('/api/user/video-cards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: currentCard.card.id,
          cardType: currentCard.card_type,
          quality,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            toast.error('复习记录同步失败')
          }
        })
        .catch((error) => {
          console.error('[handleReview] Network error:', error)
          toast.error('网络错误，复习记录未同步')
        })
    },
    [currentCard, currentIndex, totalCards, updateCardTransform]
  )

  // 触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    }
    isDraggingRef.current = true
  }, [])

  // 触摸移动 - 使用 RAF 节流，直接操作 DOM
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !isDraggingRef.current) return

    // 取消上一帧
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    // 使用 RAF 节流
    rafRef.current = requestAnimationFrame(() => {
      if (!touchStartRef.current) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y

      swipeOffsetRef.current = { x: deltaX, y: deltaY }

      // 直接更新 DOM，不触发 React 重渲染
      updateCardTransform(deltaX, deltaY, true)

      // 检测滑动方向提示（这个需要 setState 因为要显示 UI）
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)
      const threshold = SWIPE_THRESHOLD * 0.5

      if (absX > threshold || absY > threshold) {
        const newHint = absX > absY
          ? (deltaX > 0 ? 'right' : 'left')
          : (deltaY > 0 ? 'down' : 'up')
        setSwipeHint(prev => prev !== newHint ? newHint : prev)
      } else {
        setSwipeHint(prev => prev !== null ? null : prev)
      }
    })
  }, [updateCardTransform])

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    // 取消未执行的 RAF
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

    // 判断是否触发滑动（距离或速度）
    const isHorizontalSwipe = absX > SWIPE_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD
    const isVerticalSwipe = absY > SWIPE_THRESHOLD || velocityY > SWIPE_VELOCITY_THRESHOLD

    // 水平滑动评分（正反两面都可以）
    if (isHorizontalSwipe && absX > absY) {
      if (deltaX > 0) {
        // 右滑 = 简单
        handleReview(3)
      } else {
        // 左滑 = 忘记
        handleReview(1)
      }
      return
    } else if (isVerticalSwipe && absY > absX) {
      if (deltaY > 0) {
        // 下滑 = 一般
        handleReview(2)
      } else {
        // 上滑 = 翻转卡片（仅在未翻转时）
        if (!isFlipped) {
          setIsFlipped(true)
          swipeOffsetRef.current = { x: 0, y: 0 }
          isDraggingRef.current = false
          updateCardTransform(0, 0, false)
          setSwipeHint(null)
          touchStartRef.current = null
        }
      }
      return
    }

    // 未触发滑动，重置状态
    swipeOffsetRef.current = { x: 0, y: 0 }
    isDraggingRef.current = false
    updateCardTransform(0, 0, false)
    setSwipeHint(null)
    touchStartRef.current = null
  }, [isFlipped, handleReview, updateCardTransform])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentCard) return

      // 翻转卡片
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setIsFlipped(!isFlipped)
        return
      }

      // 评分快捷键（正反两面都可以）
      if (e.key === '1' || e.key === 'ArrowLeft') {
        handleReview(1) // 忘记
      } else if (e.key === '2' || e.key === 'ArrowDown') {
        handleReview(2) // 一般
      } else if (e.key === '3' || e.key === 'ArrowRight') {
        handleReview(3) // 简单
      } else if (e.key === 'ArrowUp' && !isFlipped) {
        // 未翻转时，上键翻转
        setIsFlipped(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentCard, isFlipped, handleReview])

  // 重新开始
  const handleRestart = useCallback(() => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setReviewedCount(0)
    setCorrectCount(0)
    mutate()
  }, [mutate])

  // 获取卡片类型配置
  const getTypeConfig = (type: CardType) => {
    return CARD_TYPE_LABELS[type] || { label: '未知', icon: BookOpen, color: 'bg-gray-100' }
  }

  // 获取滑动提示颜色
  const getSwipeHintColor = () => {
    if (!swipeHint) return null
    switch (swipeHint) {
      case 'left':
        return 'bg-red-500/20 border-red-500'
      case 'right':
        return 'bg-green-500/20 border-green-500'
      case 'down':
        return 'bg-yellow-500/20 border-yellow-500'
      case 'up':
        return 'bg-blue-500/20 border-blue-500'
      default:
        return null
    }
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-[3px] border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-500">加载卡片中...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto bg-red-100 border-[3px] border-black flex items-center justify-center mb-4">
            <span className="text-2xl">😢</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4 font-bold">加载失败</p>
          <button
            onClick={() => mutate()}
            className="px-6 py-3 bg-[#B4F416] border-[3px] border-black shadow-[4px_4px_0px_0px_#000] font-black hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  // 空状态
  if (!data || data.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 mx-auto bg-[#B4F416] border-[3px] border-black shadow-[6px_6px_0px_0px_#000] flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-black" />
          </div>
          <h3 className="text-2xl font-black text-black dark:text-white mb-2">
            暂无待复习内容
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            你已经完成了所有卡片的复习，继续学习新视频来获取更多卡片吧！
          </p>
          <Link
            href="/videos"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#B4F416] text-black font-black border-[3px] border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
          >
            <Video className="w-5 h-5" />
            浏览视频
          </Link>
        </div>
      </div>
    )
  }

  // 完成状态
  if (currentIndex >= totalCards) {
    const accuracy = reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 mx-auto bg-[#B4F416] border-[3px] border-black shadow-[6px_6px_0px_0px_#000] flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-black" />
          </div>
          <h3 className="text-2xl font-black text-black dark:text-white mb-2">
            复习完成！
          </h3>

          {/* 统计 */}
          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="bg-white dark:bg-gray-800 border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_#000]">
              <div className="text-3xl font-black text-black dark:text-white">{reviewedCount}</div>
              <div className="text-sm text-gray-500 font-bold">已复习</div>
            </div>
            <div className="bg-white dark:bg-gray-800 border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_#000]">
              <div className="text-3xl font-black text-[#B4F416]">{accuracy}%</div>
              <div className="text-sm text-gray-500 font-bold">正确率</div>
            </div>
          </div>

          <button
            onClick={handleRestart}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#B4F416] text-black font-black border-[3px] border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            再复习一轮
          </button>
        </div>
      </div>
    )
  }

  const card = currentCard.card
  const cardType = currentCard.card_type
  const typeConfig = getTypeConfig(cardType)
  const swipeHintColor = getSwipeHintColor()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        {/* 页面头部 */}
        <div className="bg-white dark:bg-gray-800 border-b-[3px] border-black dark:border-gray-600 shrink-0">
          <div className="max-w-4xl mx-auto px-4 py-4 md:py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-[4px_4px_0px_0px_#B4F416]">
                  <span className="font-bold text-sm">R</span>
                </div>
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-wide text-black dark:text-white">
                  卡片复习
                </h1>
              </div>
              <Link
                href="/videos"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-[2px] border-black dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-bold text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">返回视频</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 flex flex-col gap-4 overflow-hidden">
          {/* 统计概览 */}
          <div className="shrink-0 grid grid-cols-4 gap-2 md:gap-3">
            <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 p-2 md:p-3 text-center shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]">
              <div className="text-lg md:text-2xl font-black text-black dark:text-white">{totalCards}</div>
              <div className="text-[10px] md:text-xs text-gray-500 font-bold">待复习</div>
            </div>
            <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 p-2 md:p-3 text-center shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]">
              <div className="text-lg md:text-2xl font-black text-[#B4F416]">{reviewedCount}</div>
              <div className="text-[10px] md:text-xs text-gray-500 font-bold">已复习</div>
            </div>
            <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 p-2 md:p-3 text-center shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]">
              <div className="text-lg md:text-2xl font-black text-green-500">
                {reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0}%
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 font-bold">正确率</div>
            </div>
            <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 p-2 md:p-3 text-center shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]">
              <Flame className="w-4 h-4 md:w-5 md:h-5 text-orange-500 mx-auto" />
              <div className="text-[10px] md:text-xs text-gray-500 font-bold mt-1">连续</div>
            </div>
          </div>

          {/* 进度条 */}
          <div className="shrink-0 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 p-3 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-black text-black dark:text-white">
                {currentIndex + 1} / {totalCards}
              </span>
              <span className={cn(
                'px-3 py-1 text-xs font-black border-[2px] border-black',
                typeConfig.color
              )}>
                {typeConfig.label}
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 border-[2px] border-black">
              <div
                className="h-full bg-[#B4F416] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 滑动提示 - 仅移动端 */}
          <div className="shrink-0 md:hidden flex justify-center gap-3 text-xs text-gray-400 dark:text-gray-500 py-1">
            {!isFlipped && (
              <div className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                <span>翻转</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <ArrowLeft className="w-3 h-3 text-red-500" />
              <span className="text-red-500">忘记</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowDown className="w-3 h-3 text-yellow-500" />
              <span className="text-yellow-500">一般</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-green-500" />
              <span className="text-green-500">简单</span>
            </div>
          </div>

          {/* 卡片容器 - 填充剩余空间 */}
          <div
            className="flex-1 relative min-h-0 touch-none"
            style={{ perspective: '1000px' }}
          >
            {/* 滑动方向指示器 */}
            {swipeHint && (
              <div className={cn(
                'absolute inset-0 z-10 flex items-center justify-center pointer-events-none transition-all duration-150 border-[3px]',
                swipeHintColor
              )}>
                <div className="text-4xl font-black">
                  {swipeHint === 'left' && '❌ 忘记'}
                  {swipeHint === 'right' && '✅ 简单'}
                  {swipeHint === 'down' && '😐 一般'}
                  {swipeHint === 'up' && '🔄 翻转'}
                </div>
              </div>
            )}

            {/* 卡片 */}
            <div
              ref={cardRef}
              className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
              style={{ touchAction: 'none' }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* 正面 */}
              <div
                className={cn(
                  'absolute inset-0 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] p-6 flex flex-col transition-all duration-300',
                  isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
                )}
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <p className="text-2xl md:text-4xl font-black text-black dark:text-white mb-4">
                    {card.text}
                  </p>
                  {card.phonetic && (
                    <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg">
                      {card.phonetic}
                    </p>
                  )}
                </div>

                {/* 播放按钮 - 仅单词卡片显示 */}
                {card.text && cardType === 'word' && (
                  <div className="flex justify-center mb-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        playAudio(card.text, card.video_language)
                      }}
                      disabled={isAudioLoading}
                      className="p-3 bg-[#B4F416] border-[3px] border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-0.5 transition-all active:translate-y-0 active:shadow-[2px_2px_0px_0px_#000] disabled:opacity-50 disabled:cursor-wait"
                    >
                      {isAudioLoading ? (
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-black" />
                      )}
                    </button>
                  </div>
                )}

                <div className="text-center text-sm text-gray-400 dark:text-gray-500 font-bold">
                  <span className="hidden md:inline">点击翻转 · </span>
                  <span className="md:hidden">上滑翻转</span>
                </div>
              </div>

              {/* 背面 */}
              <div
                className={cn(
                  'absolute inset-0 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] p-4 md:p-6 flex flex-col transition-all duration-300',
                  isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="flex-1 overflow-y-auto space-y-3">
                  {/* 翻译 */}
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-bold mb-1">翻译</p>
                    <p className="text-lg md:text-xl font-bold text-black dark:text-white">
                      {card.translation}
                    </p>
                  </div>

                  {/* 词性/定义 */}
                  {card.part_of_speech && (
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-bold mb-1">词性</p>
                      <p className="text-black dark:text-white font-medium">{card.part_of_speech}</p>
                    </div>
                  )}

                  {card.definition && (
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-bold mb-1">定义</p>
                      <p className="text-black dark:text-white font-medium">{card.definition}</p>
                    </div>
                  )}

                  {/* 例句 */}
                  {card.examples && card.examples.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-bold mb-2">例句</p>
                      <div className="space-y-2">
                        {card.examples.map((example, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 dark:bg-gray-700 border-[2px] border-gray-200 dark:border-gray-600"
                          >
                            <p className="font-medium text-black dark:text-white">{example.original}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 来源 */}
                  {card.video_title && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                      <Video className="w-4 h-4" />
                      <span className="truncate">{card.video_title}</span>
                    </div>
                  )}
                </div>

                {/* 评分按钮 - PC端 */}
                <div className="hidden md:block pt-4 border-t-[3px] border-black dark:border-gray-600 mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-bold text-center mb-3">
                    你记住了吗？
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {REVIEW_OPTIONS.map((option) => (
                      <button
                        key={option.quality}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReview(option.quality as 1 | 2 | 3)
                        }}
                        className={cn(
                          'flex flex-col items-center py-3 px-2 border-[3px] border-black transition-all',
                          'hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5',
                          option.color
                        )}
                      >
                        <span className={cn('text-sm font-black', option.textColor)}>
                          {option.label}
                        </span>
                        <span className="text-[10px] text-gray-500 mt-0.5">{option.subLabel}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
                    快捷键：← 1=忘记 · ↓ 2=一般 · → 3=简单
                  </p>
                </div>

                {/* 评分按钮 - 移动端 */}
                <div className="md:hidden pt-3 border-t-[3px] border-black dark:border-gray-600 mt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold text-center mb-2">
                    滑动评分或点击按钮
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {REVIEW_OPTIONS.map((option) => (
                      <button
                        key={option.quality}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReview(option.quality as 1 | 2 | 3)
                        }}
                        className={cn(
                          'flex flex-col items-center py-2 px-1 border-[2px] border-black transition-all active:translate-y-0.5',
                          option.color
                        )}
                      >
                        <span className={cn('text-xs font-black', option.textColor)}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 键盘提示 - 仅PC端 */}
          <div className="shrink-0 hidden md:block text-center text-sm text-gray-400 dark:text-gray-500 py-2">
            ↑ 翻转 · ← 忘记 · ↓ 一般 · → 简单 · 或数字键 1/2/3
          </div>
        </div>
      </div>
  )
}
