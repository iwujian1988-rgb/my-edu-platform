'use client'

/**
 * 视频卡片复习页 - 客户端组件
 *
 * 基于 SM-2 算法的间隔重复复习
 * 支持多种卡片类型（词汇、短语、惯用语）
 * 支持按视频和卡片类型筛选
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  ChevronRight,
  RotateCcw,
  Check,
  X,
  Volume2,
  Clock,
  BookOpen,
  MessageSquare,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Filter,
  XCircle,
} from 'lucide-react'
import type {
  VideoCard,
  CardType,
  FlashcardReviewItem,
  FlashcardReviewResponse,
} from '@/types/video'

// 卡片类型选项
const CARD_TYPE_OPTIONS: { value: CardType | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '全部', icon: null },
  { value: 'word', label: '词汇', icon: <BookOpen className="w-4 h-4" /> },
  { value: 'phrase', label: '短语', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'expression', label: '惯用语', icon: <Sparkles className="w-4 h-4" /> },
]

// SWR fetcher
const fetcher = async (url: string): Promise<FlashcardReviewResponse> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  const json = await res.json()
  return json.data
}

export function VideoFlashcardsClient() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  // 筛选状态
  const [selectedVideoId, setSelectedVideoId] = useState<string>('all')
  const [selectedCardType, setSelectedCardType] = useState<CardType | 'all'>('all')

  // 构建查询参数
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (selectedVideoId && selectedVideoId !== 'all') {
      params.set('video_id', selectedVideoId)
    }
    if (selectedCardType && selectedCardType !== 'all') {
      params.set('card_type', selectedCardType)
    }
    params.set('limit', '50')
    return params.toString()
  }, [selectedVideoId, selectedCardType])

  // 获取待复习卡片
  const { data, error, isLoading, mutate } = useSWR<FlashcardReviewResponse>(
    `/api/user/video-cards/review?${queryParams}`,
    fetcher
  )

  // 当筛选条件改变时重置
  useEffect(() => {
    setCurrentIndex(0)
    setIsFlipped(false)
  }, [selectedVideoId, selectedCardType])

  // 提取视频列表（从卡片数据中）
  const videoOptions = useMemo(() => {
    if (!data?.items) return []
    const videoMap = new Map<string, string>()
    data.items.forEach((item) => {
      const videoId = item.card.video_id
      const videoTitle = item.card.video_title
      if (videoId && videoTitle) {
        videoMap.set(videoId, videoTitle)
      }
    })
    return Array.from(videoMap.entries()).map(([id, title]) => ({ id, title }))
  }, [data?.items])

  const currentCard = data?.items[currentIndex]
  const totalCards = data?.items.length || 0
  const progress = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0

  // 提交复习结果（必须定义在 useEffect 之前）
  const handleReview = useCallback(
    async (quality: 1 | 2 | 3) => {
      if (!currentCard) return

      try {
        await fetch('/api/user/video-cards/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId: currentCard.card.id,
            cardType: currentCard.card_type,
            quality, // 1=忘记, 2=一般, 3=简单
          }),
        })

        setReviewedCount((c) => c + 1)
        if (quality >= 2) {
          setCorrectCount((c) => c + 1)
        }

        // 下一张
        if (currentIndex < totalCards - 1) {
          setCurrentIndex((i) => i + 1)
          setIsFlipped(false)
        }
      } catch (error) {
        console.error('Failed to submit review:', error)
      }
    },
    [currentCard, currentIndex, totalCards]
  )

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentCard) return

      // 翻转卡片
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setIsFlipped(!isFlipped)
      }

      // 卡片翻转后的评分快捷键
      if (isFlipped) {
        if (e.key === '1') handleReview(1) // 忘记
        if (e.key === '2') handleReview(2) // 一般
        if (e.key === '3') handleReview(3) // 简单
        return
      }

      // 卡片未翻转时的快捷键（不认识/认识）
      if (!isFlipped) {
        // 不认识 - 只翻转卡片
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault()
          setIsFlipped(true)
        }

        // 认识 - 翻转并标记为简单
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault()
          handleReview(3)
        }
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

  // 获取卡片类型图标
  const getTypeIcon = (type: CardType) => {
    switch (type) {
      case 'word':
        return <BookOpen className="w-4 h-4" />
      case 'phrase':
        return <MessageSquare className="w-4 h-4" />
      case 'expression':
        return <Sparkles className="w-4 h-4" />
    }
  }

  // 获取卡片类型名称
  const getTypeName = (type: CardType) => {
    switch (type) {
      case 'word':
        return '词汇'
      case 'phrase':
        return '短语'
      case 'expression':
        return '惯用语'
    }
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="max-w-2xl mx-auto">
          <div className="aspect-[3/4] rounded-lg border bg-card animate-pulse" />
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="container py-6">
        <div className="text-center py-16">
          <p className="text-muted-foreground">加载失败</p>
          <Button variant="outline" className="mt-4" onClick={() => mutate()}>
            重试
          </Button>
        </div>
      </div>
    )
  }

  // 空状态
  if (!data || data.items.length === 0) {
    return (
      <div className="container py-6">
        <div className="text-center py-16">
          <Check className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">暂无待复习内容</h3>
          <p className="text-muted-foreground mb-6">
            你已经完成了所有卡片的复习，继续学习新视频来获取更多卡片吧！
          </p>
          <Button asChild>
            <a href="/videos">浏览视频</a>
          </Button>
        </div>
      </div>
    )
  }

  // 完成状态
  if (currentIndex >= totalCards) {
    const accuracy = Math.round((correctCount / reviewedCount) * 100)
    return (
      <div className="container py-6">
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">复习完成！</h3>
          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="p-4 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{reviewedCount}</div>
              <div className="text-sm text-muted-foreground">已复习</div>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">正确率</div>
            </div>
          </div>
          <Button onClick={handleRestart}>
            <RotateCcw className="w-4 h-4 mr-2" />
            再复习一轮
          </Button>
        </div>
      </div>
    )
  }

  const card = currentCard.card
  const cardType = currentCard.card_type

  return (
    <div className="container py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 筛选器 */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>筛选：</span>
          </div>

          {/* 卡片类型筛选 */}
          <div className="flex items-center gap-1">
            {CARD_TYPE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={selectedCardType === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCardType(option.value)}
                className="h-8"
              >
                {option.icon}
                <span className="ml-1">{option.label}</span>
              </Button>
            ))}
          </div>

          {/* 视频筛选（只有当有多个视频时显示） */}
          {videoOptions.length > 1 && (
            <Select
              value={selectedVideoId}
              onValueChange={setSelectedVideoId}
            >
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="选择视频" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部视频</SelectItem>
                {videoOptions.map((video) => (
                  <SelectItem key={video.id} value={video.id}>
                    <span className="truncate max-w-[140px] block">
                      {video.title}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* 清除筛选按钮 */}
          {(selectedVideoId !== 'all' || selectedCardType !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setSelectedVideoId('all')
                setSelectedCardType('all')
              }}
            >
              <XCircle className="w-4 h-4 mr-1" />
              清除
            </Button>
          )}
        </div>

        {/* 进度 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>
              {currentIndex + 1} / {totalCards}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {getTypeIcon(cardType)}
                <span className="ml-1">{getTypeName(cardType)}</span>
              </Badge>
              {card.video_title && (
                <Badge variant="secondary" className="max-w-[150px] truncate">
                  {card.video_title}
                </Badge>
              )}
            </div>
          </div>
          <Progress value={progress} />
        </div>

        {/* 卡片 */}
        <div
          className="relative aspect-[3/4] cursor-pointer perspective-1000"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* 正面 */}
          <div
            className={cn(
              'absolute inset-0 rounded-lg border bg-card p-6 flex flex-col transition-all duration-300 backface-hidden',
              isFlipped ? 'rotate-y-180 opacity-0' : 'rotate-y-0 opacity-100'
            )}
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-3xl font-bold mb-4">{card.text}</p>
              {card.phonetic && (
                <p className="text-muted-foreground text-lg">{card.phonetic}</p>
              )}
            </div>
            <div className="text-center text-sm text-muted-foreground">
              点击翻转
            </div>
          </div>

          {/* 背面 */}
          <div
            className={cn(
              'absolute inset-0 rounded-lg border bg-card p-6 flex flex-col transition-all duration-300 backface-hidden',
              isFlipped ? 'rotate-y-0 opacity-100' : '-rotate-y-180 opacity-0'
            )}
          >
            <div className="flex-1 overflow-y-auto">
              {/* 翻译 */}
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-1">翻译</p>
                <p className="text-xl font-medium">{card.translation}</p>
              </div>

              {/* 词性/定义 */}
              {card.part_of_speech && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">词性</p>
                  <p>{card.part_of_speech}</p>
                </div>
              )}

              {card.definition && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">定义</p>
                  <p>{card.definition}</p>
                </div>
              )}

              {/* 例句 */}
              {card.examples && card.examples.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">例句</p>
                  <div className="space-y-2">
                    {card.examples.map((example, index) => (
                      <div key={index} className="p-3 rounded bg-muted">
                        <p className="font-medium">{example.original}</p>
                        {example.cn && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {example.cn}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 下次复习时间 */}
              {currentCard.next_review && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    下次复习：{new Date(currentCard.next_review).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* 评分按钮 */}
            <div className="pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground text-center mb-3">
                你记住了吗？
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="flex-col h-auto py-3 border-red-200 hover:bg-red-50 hover:border-red-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReview(1)
                  }}
                >
                  <ThumbsDown className="w-5 h-5 text-red-500 mb-1" />
                  <span className="text-xs">忘记</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-col h-auto py-3 border-yellow-200 hover:bg-yellow-50 hover:border-yellow-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReview(2)
                  }}
                >
                  <Minus className="w-5 h-5 text-yellow-500 mb-1" />
                  <span className="text-xs">一般</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-col h-auto py-3 border-green-200 hover:bg-green-50 hover:border-green-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReview(3)
                  }}
                >
                  <ThumbsUp className="w-5 h-5 text-green-500 mb-1" />
                  <span className="text-xs">简单</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                快捷键：1=忘记, 2=一般, 3=简单
              </p>
            </div>
          </div>
        </div>

        {/* 键盘提示 */}
        <div className="text-center text-sm text-muted-foreground">
          ←/A: 不认识 | 空格键翻转 | →/D: 认识 | 数字键评分
        </div>
      </div>
    </div>
  )
}
