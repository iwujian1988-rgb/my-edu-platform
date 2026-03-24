'use client'

/**
 * 视频学习页 - 客户端组件
 *
 * 优化版本：接收服务器端预取的数据，无需客户端再次请求
 *
 * 交互特性：
 * - PC端：滚动时左侧视频区、右侧学习区各自吸顶
 * - 移动端：滚动时视频区吸顶，Tab栏紧贴视频底部
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Headphones,
  Mic,
  Pen,
  BookOpen,
  ArrowLeft,
  Share2,
  ChevronDown,
  Download,
  Eye,
  Pin,
  PinOff,
} from 'lucide-react'

import { VideoPlayer } from '@/components/video/VideoPlayer'
import { SubtitleList } from '@/components/video/SubtitleList'
import { CardPopover } from '@/components/video/CardPopover'
import { RecordingPanel } from '@/components/video/RecordingPanel'
import { FillBlankExercise } from '@/components/video/exercises/FillBlankExercise'
import { LearningCards } from '@/components/video/LearningCards'
import { LearningTabs } from '@/components/video/learning/LearningTabs'
import { LearningModal } from '@/components/video/learning/LearningModal'
import { AccessDenied } from '@/components/video/AccessDenied'

import { useVideoProgress } from '@/hooks/useVideoProgress'
import { useCardProgress } from '@/hooks/useCardProgress'
import { useVideoFavorites } from '@/hooks/useVideoFavorites'

import type {
  VideoFullResponseExtended,
  VideoWordCard,
  VideoPhraseCard,
  VideoExpressionCard,
  CardType,
} from '@/types/video'
import { VIDEO_DIFFICULTY_LABELS, VIDEO_LANGUAGE_LABELS } from '@/types/video'

interface Props {
  videoId: string
  initialData: VideoFullResponseExtended
}

type TabValue = 'listen' | 'speak' | 'write' | 'learn'

export default function VideoLearningClient({ videoId, initialData }: Props) {
  const router = useRouter()
  const data = initialData

  // 检测屏幕尺寸，只渲染对应的一个视频播放器
  const [isLargeScreen, setIsLargeScreen] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024) // lg breakpoint
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // 状态
  const [currentTab, setCurrentTab] = useState<TabValue>('listen')
  const [currentVideoTime, setCurrentVideoTime] = useState(0)
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'original' | 'chinese'>('bilingual')
  const [selectedCard, setSelectedCard] = useState<{
    card: VideoWordCard | VideoPhraseCard | VideoExpressionCard
    type: CardType
  } | null>(null)
  const [seekToTime, setSeekToTime] = useState<number | undefined>(undefined)
  const [pauseMainVideo, setPauseMainVideo] = useState(false) // 暂停主视频（打开弹层时）
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false) // PC端学习弹层

  // 字幕滚动控制
  const [autoScroll, setAutoScroll] = useState(true)
  const [exportTrigger, setExportTrigger] = useState(0) // 导出弹窗触发器

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

  const { getCardStatus, updateStatus } = useCardProgress({ videoId })
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

  // 字幕点击 - 跳转到对应时间
  const handleSubtitleClick = useCallback((subtitle: { start_time: number }) => {
    // 使用 seekToTime 状态通知 VideoPlayer 跳转
    // 这会自动处理视频未加载的情况
    setSeekToTime(subtitle.start_time)
  }, [])

  // 播放片段
  const [segmentEndTime, setSegmentEndTime] = useState<number | undefined>(undefined)

  const handlePlaySegment = useCallback((startTime: number, endTime: number) => {
    // 设置片段结束时间（VideoPlayer 会自动在到达时暂停）
    setSegmentEndTime(endTime)
    // 使用 seekToTime 状态触发 VideoPlayer 跳转
    setSeekToTime(startTime)
  }, [])

  // 卡片跳转字幕映射
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

  const handleJumpToSubtitle = useCallback(
    (cardType: CardType, cardId: string) => {
      const map = cardToSubtitleMap()
      const key = `${cardType}_${cardId}`
      const subtitleInfo = map.get(key)

      if (subtitleInfo) {
        setCurrentTab('listen')
        const videoEl = document.querySelector('video')
        if (videoEl) {
          videoEl.currentTime = subtitleInfo.startTime
        }
      }
    },
    [cardToSubtitleMap]
  )

  const handleHighlightClick = useCallback(
    async (cardType: CardType, cardId: string) => {
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

  const handleCardStatusChange = useCallback(
    async (status: 'known' | 'unknown' | 'learning') => {
      if (!selectedCard) return

      await updateStatus(selectedCard.type, selectedCard.card.id, status)
      setSelectedCard(null)
    },
    [selectedCard, updateStatus]
  )

  // 无权限
  if (!data.has_access) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 border-[2px] border-black dark:border-gray-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <AccessDenied packages={[]} videoTitle={data.video.title} />
        </div>
      </div>
    )
  }

  const { video, subtitles, cards, exercises, grammar_points, pronunciation_tips, vocabulary_network } = data

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* ===== 移动端布局 ===== */}
      <div className="lg:hidden">
        {/* 视频区 - 吸顶 */}
        <div className="sticky top-0 z-40 bg-gray-50 dark:bg-gray-900">
          {/* 返回按钮 */}
          <div className="px-3 py-1.5">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] active:shadow-[1px_1px_0px_0px_#000] active:translate-y-0.5 transition-all"
            >
              <ArrowLeft className="w-3 h-3" />
              返回
            </button>
          </div>

          {/* 视频播放器 - 只在移动端渲染 */}
          {!isLargeScreen && (
            <VideoPlayer
              video={video}
              onTimeUpdate={handleTimeUpdate}
              initialPosition={data.user_progress?.last_position || 0}
              seekTo={seekToTime}
              segmentEndTime={segmentEndTime}
              pause={pauseMainVideo}
            />
          )}

          {/* 功能按钮导航 - 5个图标按钮 + 字幕模式下拉菜单 */}
          <div className="bg-white dark:bg-gray-800 border-b-[3px] border-black dark:border-gray-600 px-3 py-2">
            {/* 使用 justify-end 让按钮始终靠右，小眼睛显示时自然在按钮左侧 */}
            <div className="flex items-center justify-end gap-1">
              {/* 字幕模式下拉菜单 - 只在听模式显示 */}
              {currentTab === 'listen' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 px-2 py-2 text-sm font-bold bg-[#B4F416] text-black border-[2px] border-black rounded-lg shadow-[2px_2px_0px_0px_#000]">
                      <Eye className="w-4 h-4" />
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="border-[2px] border-black shadow-[3px_3px_0px_0px_#000] bg-white dark:bg-gray-800">
                    <DropdownMenuItem
                      onClick={() => setDisplayMode('original')}
                      className={cn("cursor-pointer font-bold", displayMode === 'original' && "bg-[#B4F416]")}
                    >
                      原文
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDisplayMode('chinese')}
                      className={cn("cursor-pointer font-bold", displayMode === 'chinese' && "bg-[#B4F416]")}
                    >
                      中文
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDisplayMode('bilingual')}
                      className={cn("cursor-pointer font-bold", displayMode === 'bilingual' && "bg-[#B4F416]")}
                    >
                      双语
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* 5个功能按钮 - 所有按钮统一 shadow 样式，避免点击时跳动 */}
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentTab('listen')} className={cn("p-2 rounded-lg border-[2px] border-black shadow-[2px_2px_0px_0px_#000] transition-colors", currentTab === 'listen' ? "bg-[#B4F416] text-black" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300")} title="听">
                  <Headphones className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentTab('speak')} className={cn("p-2 rounded-lg border-[2px] border-black shadow-[2px_2px_0px_0px_#000] transition-colors", currentTab === 'speak' ? "bg-[#B4F416] text-black" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300")} title="说读">
                  <Mic className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentTab('write')} className={cn("p-2 rounded-lg border-[2px] border-black shadow-[2px_2px_0px_0px_#000] transition-colors", currentTab === 'write' ? "bg-[#B4F416] text-black" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300")} title="写">
                  <Pen className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentTab('learn')} className={cn("p-2 rounded-lg border-[2px] border-black shadow-[2px_2px_0px_0px_#000] transition-colors", currentTab === 'learn' ? "bg-[#B4F416] text-black" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300")} title="学">
                  <BookOpen className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setExportTrigger(prev => prev + 1)}
                  className="p-2 rounded-lg border-[2px] border-black bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors shadow-[2px_2px_0px_0px_#000]"
                  title="导出字幕"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 内容区 - 移动端使用固定高度 60vh */}
        {/* listen/speak/write 有内部滚动，learn 需要容器滚动 */}
        <div className={cn(
          "bg-white dark:bg-gray-800 border-[3px] border-t-0 border-black dark:border-gray-600 h-[60vh]",
          currentTab === 'learn' ? "overflow-y-auto" : "overflow-hidden"
        )}>
          {currentTab === 'listen' && (
            <SubtitleList
              subtitles={subtitles}
              currentVideoTime={currentVideoTime}
              onSubtitleClick={handleSubtitleClick}
              onHighlightClick={handleHighlightClick}
              displayMode={displayMode}
              autoScroll={autoScroll}
              externalExportTrigger={exportTrigger}
            />
          )}
          {currentTab === 'speak' && (
            <RecordingPanel
              videoId={videoId}
              videoUrl={video.video_url}
              subtitles={subtitles}
              currentVideoTime={currentVideoTime}
              onPlaySegment={handlePlaySegment}
              onPauseMainVideo={() => setPauseMainVideo(true)}
              onDialogClose={() => setPauseMainVideo(false)}
            />
          )}
          {currentTab === 'write' && (
            <FillBlankExercise exercises={exercises} onCheckAnswer={() => {}} />
          )}
          {currentTab === 'learn' && (
            <LearningTabs
              words={data.cards.words}
              expressions={data.cards.expressions}
              grammarPoints={data.grammar_points}
              pronunciationTips={data.pronunciation_tips}
              vocabularyNetwork={data.vocabulary_network}
              onJumpToSubtitle={(time) => {
                setCurrentTab('listen')
                setSeekToTime(time)
              }}
              getCardStatus={getCardStatus}
              onStatusChange={updateStatus}
            />
          )}
        </div>
      </div>

      {/* ===== PC端布局 ===== */}
      <div className="hidden lg:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-3 gap-4">
          {/* 左侧：视频区 - 吸顶 */}
          <div className="col-span-2">
            <div className="sticky top-4 z-30 space-y-4">
              {/* 返回按钮 */}
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="border-[2px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回列表
              </Button>

              {/* 视频播放器 - 只在PC端渲染 */}
              {isLargeScreen && (
                <VideoPlayer
                  video={video}
                  onTimeUpdate={handleTimeUpdate}
                  initialPosition={data.user_progress?.last_position || 0}
                  seekTo={seekToTime}
                  segmentEndTime={segmentEndTime}
                  pause={pauseMainVideo}
                />
              )}

              {/* 视频信息 */}
              <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] p-4 transition-colors duration-300">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-black text-black dark:text-white">{video.title}</h1>
                    {video.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {video.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="px-2 py-1 bg-[#B4F416] border-[2px] border-black text-xs font-bold">
                        {VIDEO_LANGUAGE_LABELS[video.language]}
                      </div>
                      <div className="px-2 py-1 bg-white dark:bg-gray-700 border-[2px] border-black dark:border-gray-500 text-xs font-bold text-black dark:text-white">
                        {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
                      </div>
                      {video.creator_name && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {video.creator_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000]"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：学习区 - 吸顶 */}
          <div className="col-span-1">
            <div className="sticky top-4 z-30">
              {/* 占位符：与左侧返回按钮高度对齐 */}
              <div className="h-10 mb-4" />

              <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] overflow-hidden transition-colors duration-300">
                {/* 功能按钮导航 - 5个图标按钮 + 字幕模式下拉菜单 */}
                <div className="bg-gray-50 dark:bg-gray-700 border-b-[3px] border-black dark:border-gray-600 p-2">
                  <div className="flex items-center justify-between gap-1">
                    {/* 字幕模式下拉菜单 */}
                    {currentTab === 'listen' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1 px-2 py-2 text-sm font-bold bg-white dark:bg-gray-600 text-black dark:text-white border-[2px] border-black rounded-lg shadow-[2px_2px_0px_0px_#000]">
                            <Eye className="w-4 h-4" />
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="border-[2px] border-black shadow-[3px_3px_0px_0px_#000] bg-white dark:bg-gray-800">
                          <DropdownMenuItem
                            onClick={() => setDisplayMode('original')}
                            className={cn("cursor-pointer font-bold", displayMode === 'original' && "bg-[#B4F416]")}
                          >
                            原文
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDisplayMode('chinese')}
                            className={cn("cursor-pointer font-bold", displayMode === 'chinese' && "bg-[#B4F416]")}
                          >
                            中文
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDisplayMode('bilingual')}
                            className={cn("cursor-pointer font-bold", displayMode === 'bilingual' && "bg-[#B4F416]")}
                          >
                            双语
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* 5个功能按钮 - 统一尺寸，避免跳动 */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCurrentTab('listen')} className={cn("p-2 rounded-lg border-[2px] border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]", currentTab === 'listen' ? "bg-[#B4F416] text-black shadow-[2px_2px_0px_0px_#000]" : "bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300")} title="听">
                        <Headphones className="w-4 h-4" />
                      </button>
                      <button onClick={() => setCurrentTab('speak')} className={cn("p-2 rounded-lg border-[2px] border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]", currentTab === 'speak' ? "bg-[#B4F416] text-black shadow-[2px_2px_0px_0px_#000]" : "bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300")} title="说读">
                        <Mic className="w-4 h-4" />
                      </button>
                      <button onClick={() => setCurrentTab('write')} className={cn("p-2 rounded-lg border-[2px] border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]", currentTab === 'write' ? "bg-[#B4F416] text-black shadow-[2px_2px_0px_0px_#000]" : "bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300")} title="写">
                        <Pen className="w-4 h-4" />
                      </button>
                      <button onClick={() => setIsLearningModalOpen(true)} className={cn("p-2 rounded-lg border-[2px] border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]", isLearningModalOpen ? "bg-[#B4F416] text-black shadow-[2px_2px_0px_0px_#000]" : "bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300")} title="学">
                        <BookOpen className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExportTrigger(prev => prev + 1)}
                        className="p-2 rounded-lg border-[2px] border-black bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                        title="导出字幕"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 内容区 */}
                <div className="relative max-h-[calc(100vh-280px)] overflow-y-auto">
                  <div className="pc-subtitle-container max-h-[calc(100vh-280px)] overflow-y-auto">
                    {currentTab === 'listen' && (
                      <SubtitleList
                        subtitles={subtitles}
                        currentVideoTime={currentVideoTime}
                        onSubtitleClick={handleSubtitleClick}
                        onHighlightClick={handleHighlightClick}
                        displayMode={displayMode}
                        autoScroll={autoScroll}
                        externalExportTrigger={exportTrigger}
                      />
                    )}

                    {currentTab === 'speak' && (
                      <div className="p-4">
                        <RecordingPanel
                          videoId={videoId}
                          videoUrl={video.video_url}
                          subtitles={subtitles}
                          currentVideoTime={currentVideoTime}
                          onPlaySegment={handlePlaySegment}
                          onPauseMainVideo={() => setPauseMainVideo(true)}
                          onDialogClose={() => setPauseMainVideo(false)}
                        />
                      </div>
                    )}

                    {currentTab === 'write' && (
                      <div className="p-4">
                        <FillBlankExercise exercises={exercises} onCheckAnswer={() => {}} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 浮动滚动控制按钮 - 仅PC端显示，在字幕列表区域 */}
      {currentTab === 'listen' && (
        <div
          className="hidden lg:flex fixed z-[100] items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-[2px] border-black rounded-lg shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]"
          style={{
            right: '24px',
            bottom: '24px',
          }}
        >
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors",
              autoScroll
                ? "bg-[#B4F416] text-black"
                : "bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
            )}
            title={autoScroll ? '点击固定字幕位置' : '点击跟随视频滚动'}
          >
            {autoScroll ? (
              <>
                <PinOff className="w-4 h-4" />
                <span>跟随中</span>
              </>
            ) : (
              <>
                <Pin className="w-4 h-4" />
                <span>已固定</span>
              </>
            )}
          </button>
        </div>
      )}

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

      {/* PC端学习弹层 - 全屏模态框，包含 PiP 视频 */}
      <LearningModal
        open={isLearningModalOpen}
        onOpenChange={setIsLearningModalOpen}
        video={video}
        words={data.cards.words}
        expressions={data.cards.expressions}
        grammarPoints={data.grammar_points}
        pronunciationTips={data.pronunciation_tips}
        vocabularyNetwork={data.vocabulary_network}
        getCardStatus={getCardStatus}
        onStatusChange={updateStatus}
        onJumpToSubtitle={(time) => {
          setIsLearningModalOpen(false)
          setSeekToTime(time)
        }}
        currentVideoTime={currentVideoTime}
        onVideoTimeUpdate={setCurrentVideoTime}
        initialVideoPosition={currentVideoTime}
      />
    </div>
  )
}
