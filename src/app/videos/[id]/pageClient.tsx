'use client'

/**
 * 视频学习页 - 客户端组件
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 2.1-2.5
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0
 *
 * 核心功能：
 * - 视频播放 + 字幕同步
 * - 四模式Tab（听/说读/写/学）
 * - 录音跟读
 * - 填空练习
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Headphones,
  Mic,
  Pen,
  BookOpen,
  ArrowLeft,
  Share2,
  Info,
} from 'lucide-react'

import { VideoPlayer } from '@/components/video/VideoPlayer'
import { SubtitleList } from '@/components/video/SubtitleList'
import { CardPopover } from '@/components/video/CardPopover'
import { RecordingPanel } from '@/components/video/RecordingPanel'
import { FillBlankExercise } from '@/components/video/exercises/FillBlankExercise'
import { LearningCards } from '@/components/video/LearningCards'
import { AccessDenied } from '@/components/video/AccessDenied'
import { LanguageFilter, DifficultyFilter } from '@/components/video/layout/LanguageFilter'

import { useVideoProgress } from '@/hooks/useVideoProgress'
import { useCardProgress } from '@/hooks/useCardProgress'
import { useVideoFavorites } from '@/hooks/useVideoFavorites'

import type {
  VideoFullResponse,
  SubtitleWithHighlights,
  VideoWordCard,
  VideoPhraseCard,
  VideoExpressionCard,
  CardType,
  VideoLanguage,
  VideoDifficulty,
} from '@/types/video'
import { VIDEO_DIFFICULTY_LABELS, VIDEO_LANGUAGE_LABELS } from '@/types/video'

// SWR fetcher
const fetcher = async (url: string): Promise<VideoFullResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 403) {
      const json = await res.json()
      return json.data
    }
    throw new Error('Failed to fetch')
  }
  const json = await res.json()
  return json.data
}

interface Props {
  videoId: string
}

type TabValue = 'listen' | 'speak' | 'write' | 'learn'

export default function VideoLearningClient({ videoId }: Props) {
  const router = useRouter()

  // 获取视频数据
  const { data, error, isLoading } = useSWR<VideoFullResponse>(
    `/api/videos/${videoId}/full`,
    fetcher
  )

  // 状态
  const [currentTab, setCurrentTab] = useState<TabValue>('listen')
  const [currentVideoTime, setCurrentVideoTime] = useState(0)
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'original' | 'chinese'>('bilingual')
  const [selectedCard, setSelectedCard] = useState<{
    card: VideoWordCard | VideoPhraseCard | VideoExpressionCard
    type: CardType
  } | null>(null)

  // Hooks
  const { updateProgress, saveProgress } = useVideoProgress({
    videoId,
    initialProgress: data?.user_progress,
    onSave: async (progress) => {
      await fetch(`/api/user/video-progress/${videoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progress),
      })
    },
  })

  const { getCardStatus, updateStatus, recordFlashcardResult } = useCardProgress({
    videoId,
  })

  const { isFavorited, toggleFavorite } = useVideoFavorites({ videoId })

  // 视频时间更新
  const handleTimeUpdate = useCallback(
    (time: number) => {
      setCurrentVideoTime(time)
      if (data?.video.duration) {
        updateProgress(time, data.video.duration)
      }
    },
    [data?.video.duration, updateProgress]
  )

  // 字幕点击
  const handleSubtitleClick = useCallback((subtitle: { start_time: number }) => {
    // 跳转视频到对应时间
    const videoEl = document.querySelector('video')
    if (videoEl) {
      videoEl.currentTime = subtitle.start_time
    }
  }, [])

  // 构建 card_id -> subtitle 的映射（用于卡片跳转字幕）
  const cardToSubtitleMap = useCallback(() => {
    const map = new Map<string, { subtitleId: string; startTime: number }>()
    if (!data?.subtitles) return map

    data.subtitles.forEach((subtitle) => {
      subtitle.highlights?.forEach((highlight) => {
        const key = `${highlight.card_type}_${highlight.card_id}`
        if (!map.has(key)) {
          map.set(key, { subtitleId: subtitle.id, startTime: subtitle.start_time })
        }
      })
    })
    return map
  }, [data?.subtitles])

  // 卡片跳转到字幕
  const handleJumpToSubtitle = useCallback(
    (cardType: CardType, cardId: string) => {
      const map = cardToSubtitleMap()
      const key = `${cardType}_${cardId}`
      const subtitleInfo = map.get(key)

      if (subtitleInfo) {
        // 切换到"听"模式
        setCurrentTab('listen')

        // 跳转视频到对应时间
        const videoEl = document.querySelector('video')
        if (videoEl) {
          videoEl.currentTime = subtitleInfo.startTime
        }
      }
    },
    [cardToSubtitleMap]
  )

  // 高亮点击
  const handleHighlightClick = useCallback(
    async (cardType: CardType, cardId: string) => {
      // 根据类型获取卡片
      let card: VideoWordCard | VideoPhraseCard | VideoExpressionCard | undefined

      if (cardType === 'word') {
        card = data?.cards.words.find((c) => c.id === cardId)
      } else if (cardType === 'phrase') {
        card = data?.cards.phrases.find((c) => c.id === cardId)
      } else if (cardType === 'expression') {
        card = data?.cards.expressions.find((c) => c.id === cardId)
      }

      if (card) {
        setSelectedCard({ card, type: cardType })
      }
    },
    [data?.cards]
  )

  // 卡片状态变更
  const handleCardStatusChange = useCallback(
    async (status: 'known' | 'unknown' | 'learning') => {
      if (!selectedCard) return

      await updateStatus(selectedCard.type, selectedCard.card.id, status)
      setSelectedCard(null)
    },
    [selectedCard, updateStatus]
  )

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-4">
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-video rounded-lg" />
            </div>
            <Skeleton className="h-[600px] rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">加载失败</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
            返回
          </Button>
        </div>
      </div>
    )
  }

  // 无权限
  if (!data.has_access) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-4">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <AccessDenied
            packages={[]}
            videoTitle={data.video.title}
          />
        </div>
      </div>
    )
  }

  const { video, subtitles, cards, exercises } = data

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-4">
        {/* 返回按钮 */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回列表
        </Button>

        {/* 主布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 左侧：视频区 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 视频播放器 */}
            <VideoPlayer
              video={video}
              onTimeUpdate={handleTimeUpdate}
              initialPosition={data.user_progress?.last_position || 0}
            />

            {/* 视频信息 */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold">{video.title}</h1>
                  {video.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {video.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">
                      {VIDEO_LANGUAGE_LABELS[video.language]}
                    </Badge>
                    <Badge variant="outline">
                      {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
                    </Badge>
                    {video.creator_name && (
                      <span className="text-sm text-muted-foreground">
                        {video.creator_name}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* 右侧：学习区 */}
          <div className="rounded-lg border bg-card overflow-hidden">
            {/* Tab 导航 */}
            <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as TabValue)}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="listen" className="text-xs sm:text-sm">
                  <Headphones className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">听</span>
                </TabsTrigger>
                <TabsTrigger value="speak" className="text-xs sm:text-sm">
                  <Mic className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">说读</span>
                </TabsTrigger>
                <TabsTrigger value="write" className="text-xs sm:text-sm">
                  <Pen className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">写</span>
                </TabsTrigger>
                <TabsTrigger value="learn" className="text-xs sm:text-sm">
                  <BookOpen className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">学</span>
                </TabsTrigger>
              </TabsList>

              {/* 听模式 */}
              <TabsContent value="listen" className="m-0">
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={displayMode === 'bilingual' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDisplayMode('bilingual')}
                    >
                      双语
                    </Button>
                    <Button
                      variant={displayMode === 'original' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDisplayMode('original')}
                    >
                      原文
                    </Button>
                    <Button
                      variant={displayMode === 'chinese' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDisplayMode('chinese')}
                    >
                      中文
                    </Button>
                  </div>
                </div>

                <SubtitleList
                  subtitles={subtitles}
                  currentVideoTime={currentVideoTime}
                  onSubtitleClick={handleSubtitleClick}
                  onHighlightClick={handleHighlightClick}
                  displayMode={displayMode}
                />
              </TabsContent>

              {/* 说读模式 */}
              <TabsContent value="speak" className="m-0 p-4">
                <RecordingPanel
                  videoId={videoId}
                  subtitles={subtitles}
                  currentVideoTime={currentVideoTime}
                />
              </TabsContent>

              {/* 写模式 */}
              <TabsContent value="write" className="m-0 p-4">
                <FillBlankExercise
                  exercises={exercises}
                  onCheckAnswer={(exerciseId, answer) => {
                    // 处理答案检查
                  }}
                />
              </TabsContent>

              {/* 学模式 */}
              <TabsContent value="learn" className="m-0">
                <LearningCards
                  cards={cards}
                  onCardClick={(card, type) => {
                    setSelectedCard({ card, type })
                  }}
                  getCardStatus={getCardStatus}
                  onStatusChange={updateStatus}
                  onJumpToSubtitle={handleJumpToSubtitle}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* 卡片弹窗 */}
      {selectedCard && (
        <CardPopover
          card={selectedCard.card}
          cardType={selectedCard.type}
          videoLanguage={video.language}
          videoId={videoId}
          onClose={() => setSelectedCard(null)}
          onStatusChange={handleCardStatusChange}
          currentStatus={getCardStatus(selectedCard.type, selectedCard.card.id)}
        />
      )}
    </div>
  )
}
